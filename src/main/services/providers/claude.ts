import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import type { AddressInfo } from 'net'
import { shell } from 'electron'
import { createHash, randomBytes, randomUUID } from 'crypto'
import type { ClaudeAccount, ClaudeLimit, ClaudeLoginResult, ClaudeUsage } from '@shared/types'
import { fetchWithTimeout } from './fetchWithTimeout'

const API_URL = 'https://api.anthropic.com/api/oauth'
const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e'
const AUTH_URL = 'https://claude.ai/oauth/authorize'
const TOKEN_URL = 'https://platform.claude.com/v1/oauth/token'
// Only the usage and profile endpoints are called, so the token is never granted inference access.
const SCOPES = 'user:profile'
const LOGIN_TIMEOUT = 300000
// ponytail: the usage endpoint rate-limits after a handful of calls, so successful results are reused.
const MIN_FETCH_INTERVAL_MS = 5 * 60 * 1000
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000

export const CLAUDE_SIGN_IN_REQUIRED = 'Claude sign-in required. Add the Claude account again to sign in.'

export interface ClaudeTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

interface ClaudeProfile {
  id?: string
  email?: string
  subscriptionType?: string
  rateLimitTier?: string
}

interface PendingLogin {
  resolve: (result: ClaudeLoginResult) => void
  server: Server
  timeoutId: NodeJS.Timeout
  resolved: boolean
}

export class ClaudeService {
  private currentLogin: PendingLogin | null = null
  private cache = new Map<string, { fetchedAt: number; usage: ClaudeUsage }>()
  private blockedUntil = new Map<string, number>()

  private finishLogin(resolveRef: PendingLogin['resolve'], result: ClaudeLoginResult): void {
    const pendingLogin = this.currentLogin

    if (!pendingLogin || pendingLogin.resolve !== resolveRef || pendingLogin.resolved) {
      return
    }

    pendingLogin.resolved = true
    clearTimeout(pendingLogin.timeoutId)
    this.currentLogin = null

    pendingLogin.resolve(result)

    if (pendingLogin.server.listening) {
      pendingLogin.server.close()
      pendingLogin.server.closeIdleConnections?.()
    }
  }

  private writeCallbackResponse(res: ServerResponse, title: string, message: string): void {
    const body = `<html><body><h1>${title}</h1><p>${message}</p></body></html>`
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(body).toString(),
      'Connection': 'close'
    })
    res.end(body)
  }

  cancelLogin(): boolean {
    if (!this.currentLogin) {
      return false
    }

    const { resolve } = this.currentLogin
    this.finishLogin(resolve, { success: false, error: 'Login cancelled' })
    return true
  }

  async login(): Promise<ClaudeLoginResult> {
    if (this.currentLogin) {
      return { success: false, error: 'Login already in progress' }
    }

    return new Promise((resolve) => {
      const state = randomBytes(32).toString('base64url')
      const codeVerifier = randomBytes(32).toString('base64url')
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
      let redirectUri = ''

      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url || '', 'http://localhost')

        if (url.pathname !== '/callback') {
          res.writeHead(404, { 'Connection': 'close' })
          res.end()
          return
        }

        const code = url.searchParams.get('code')
        const returnedState = url.searchParams.get('state')
        const error = url.searchParams.get('error')

        if (error) {
          this.writeCallbackResponse(res, 'Login Failed', 'You can close this window.')
          this.finishLogin(resolve, { success: false, error })
          return
        }

        if (returnedState !== state) {
          this.writeCallbackResponse(res, 'Security Error', 'State mismatch. Please try again.')
          this.finishLogin(resolve, { success: false, error: 'State mismatch' })
          return
        }

        if (!code) {
          this.writeCallbackResponse(res, 'Error', 'No authorization code received.')
          this.finishLogin(resolve, { success: false, error: 'No authorization code' })
          return
        }

        try {
          const data = await this.exchangeCode(code, codeVerifier, state, redirectUri)
          const tokens = toTokens(data)
          if (!tokens) throw new Error('Token exchange returned no tokens')

          const tokenAccount = isRecord(data.account) ? data.account : {}
          const profile = await this.fetchProfile(tokens.accessToken)
          const email = profile.email ?? asString(tokenAccount.email_address) ?? ''
          const account: ClaudeAccount = {
            id: profile.id
              ?? asString(tokenAccount.uuid)
              ?? (email ? createHash('md5').update(email).digest('hex') : randomUUID()),
            displayName: email || 'Claude',
            showInOverview: true,
            email,
            ...(profile.subscriptionType ? { subscriptionType: profile.subscriptionType } : {}),
            ...(profile.rateLimitTier ? { rateLimitTier: profile.rateLimitTier } : {}),
            ...tokens
          }

          this.writeCallbackResponse(res, 'Login Successful', 'You can close this window.')
          this.finishLogin(resolve, { success: true, account })
        } catch (err) {
          this.writeCallbackResponse(res, 'Error', 'Failed to complete login.')
          this.finishLogin(resolve, { success: false, error: String(err) })
        }
      })

      const timeoutId = setTimeout(() => {
        this.finishLogin(resolve, { success: false, error: 'Login timeout' })
      }, LOGIN_TIMEOUT)

      this.currentLogin = {
        resolve,
        server,
        timeoutId,
        resolved: false
      }

      server.listen(0, '127.0.0.1', () => {
        redirectUri = `http://localhost:${(server.address() as AddressInfo).port}/callback`

        const authUrl = new URL(AUTH_URL)
        authUrl.searchParams.set('code', 'true')
        authUrl.searchParams.set('client_id', CLIENT_ID)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('redirect_uri', redirectUri)
        authUrl.searchParams.set('scope', SCOPES)
        authUrl.searchParams.set('code_challenge', codeChallenge)
        authUrl.searchParams.set('code_challenge_method', 'S256')
        authUrl.searchParams.set('state', state)

        void shell.openExternal(authUrl.toString()).catch((error) => {
          this.finishLogin(resolve, { success: false, error: String(error) })
        })
      })

      server.on('error', (err) => {
        this.finishLogin(resolve, {
          success: false,
          error: `Failed to start callback server: ${err.message}`
        })
      })
    })
  }

  private async exchangeCode(
    code: string,
    codeVerifier: string,
    state: string,
    redirectUri: string
  ): Promise<Record<string, unknown>> {
    const response = await fetchWithTimeout(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
        state
      })
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`)
    }

    const data: unknown = await response.json()
    if (!isRecord(data)) throw new Error('Token exchange response was invalid')
    return data
  }

  /** Returns null when the grant is no longer valid; throws when the request itself fails. */
  async refreshToken(refreshTokenValue: string): Promise<ClaudeTokens | null> {
    const response = await fetchWithTimeout(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
        client_id: CLIENT_ID
      })
    })

    if ([400, 401, 403].includes(response.status)) return null
    if (!response.ok) throw new Error(`Claude token refresh failed: HTTP ${response.status}`)

    const data: unknown = await response.json()
    const tokens = isRecord(data) ? toTokens(data, refreshTokenValue) : null
    if (!tokens) throw new Error('Claude token refresh response was invalid')
    return tokens
  }

  async fetchUsage(account: ClaudeAccount): Promise<ClaudeUsage> {
    if (!account.accessToken) throw new Error(CLAUDE_SIGN_IN_REQUIRED)

    const now = Date.now()
    const cached = this.cache.get(account.id)
    const blockedUntil = this.blockedUntil.get(account.id) ?? 0
    if (cached && (now - cached.fetchedAt < MIN_FETCH_INTERVAL_MS || now < blockedUntil)) {
      return cached.usage
    }
    if (now < blockedUntil) throw new Error('Claude usage API is rate limited. Retrying later.')

    const response = await this.request('usage', account.accessToken)
    if (response.status === 429) {
      this.blockedUntil.set(account.id, now + getRetryAfterMs(response.headers.get('retry-after'), now))
      if (cached) return cached.usage
      throw new Error('Claude usage API is rate limited. Retrying later.')
    }
    if (response.status === 401) {
      throw new Error('Claude sign-in was rejected (401). Add the Claude account again to sign in.')
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      if (response.status === 403 && body.includes('user:profile')) throw new Error(SCOPE_ERROR)
      throw new Error(`Claude usage request failed: HTTP ${response.status}`)
    }

    let data: unknown
    try {
      data = await response.json()
    } catch {
      throw new Error('Claude usage response was not valid JSON')
    }
    if (!isRecord(data)) throw new Error('Claude usage response was invalid')

    const plan = formatPlan(account.subscriptionType, account.rateLimitTier)
    const usage: ClaudeUsage = { ...(plan ? { plan } : {}), limits: toLimits(data) }
    this.cache.set(account.id, { fetchedAt: now, usage })
    return usage
  }

  private async fetchProfile(accessToken: string): Promise<ClaudeProfile> {
    try {
      const response = await this.request('profile', accessToken)
      if (!response.ok) return {}
      const data: unknown = await response.json()
      if (!isRecord(data)) return {}
      const account = isRecord(data.account) ? data.account : {}
      const organization = isRecord(data.organization) ? data.organization : {}
      const id = asString(account.uuid)
      const email = asString(account.email) ?? asString(account.email_address)
      const subscriptionType = asString(organization.organization_type)?.replace(/^claude_/, '')
      const rateLimitTier = asString(organization.rate_limit_tier)
      return {
        ...(id ? { id } : {}),
        ...(email ? { email } : {}),
        ...(subscriptionType ? { subscriptionType } : {}),
        ...(rateLimitTier ? { rateLimitTier } : {})
      }
    } catch {
      return {}
    }
  }

  private request(path: string, accessToken: string): Promise<Response> {
    return fetchWithTimeout(`${API_URL}/${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'Accept': 'application/json',
        'User-Agent': 'claude-code/2.1.0'
      }
    })
  }
}

const SCOPE_ERROR = 'Claude sign-in lacks the user:profile scope. Add the Claude account again to sign in.'

function toTokens(data: Record<string, unknown>, previousRefreshToken?: string): ClaudeTokens | null {
  const accessToken = asString(data.access_token)
  const refreshToken = asString(data.refresh_token) ?? previousRefreshToken
  if (!accessToken || !refreshToken) return null
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600
  return { accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000 }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function getRetryAfterMs(value: string | null, now: number): number {
  if (!value) return DEFAULT_COOLDOWN_MS
  const seconds = Number(value)
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now
  return Number.isFinite(delay) && delay > 0 ? delay : DEFAULT_COOLDOWN_MS
}

function formatPlan(subscriptionType?: string, rateLimitTier?: string): string | undefined {
  const multiplier = rateLimitTier?.match(/max_(\d+x)/)?.[1]
  if (multiplier) return `Max ${multiplier}`
  return subscriptionType
    ? subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1)
    : undefined
}

function toLimits(data: Record<string, unknown>): ClaudeLimit[] {
  // Newer responses describe windows in `limits[]` and may null out the legacy fields.
  const listed = Array.isArray(data.limits) ? data.limits.filter(isRecord) : []
  const listedWindow = (kind: string): unknown => {
    const entry = listed.find(value => value.kind === kind)
    return entry ? { utilization: entry.percent, resets_at: entry.resets_at } : null
  }
  const windows: Array<[string, unknown]> = [
    ['fiveHour', data.five_hour ?? listedWindow('session')],
    ['weekly', data.seven_day ?? listedWindow('weekly_all')],
    ['weeklyModel:Opus', data.seven_day_opus],
    ['weeklyModel:Sonnet', data.seven_day_sonnet],
    ...listed.flatMap((entry): Array<[string, unknown]> => {
      if (entry.kind !== 'weekly_scoped' || !isRecord(entry.scope) || !isRecord(entry.scope.model)) return []
      const model = entry.scope.model.display_name
      return typeof model === 'string' && model
        ? [[`weeklyModel:${model}`, { utilization: entry.percent, resets_at: entry.resets_at }]]
        : []
    })
  ]

  const limits = new Map<string, ClaudeLimit>()
  for (const [type, window] of windows) {
    if (limits.has(type) || !isRecord(window)) continue
    const utilization = window.utilization
    if (typeof utilization !== 'number' || !Number.isFinite(utilization)) continue

    const used = Math.min(Math.max(utilization, 0), 100)
    limits.set(type, {
      type,
      used,
      limit: 100,
      remaining: 100 - used,
      percentage: used,
      ...(typeof window.resets_at === 'string' ? { resetTime: window.resets_at } : {}),
      unit: 'percent',
      unlimited: false
    })
  }
  return Array.from(limits.values())
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
