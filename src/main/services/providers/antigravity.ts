import { createServer, IncomingMessage, ServerResponse, type Server } from 'http'
import { shell } from 'electron'
import { randomBytes, createHash } from 'crypto'
import { AddressInfo } from 'net'
import type { ModelQuota } from '@shared/types'
import { fetchWithTimeout } from './fetchWithTimeout'

const CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com'
const CLIENT_SECRET = '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'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const API_BASE = 'https://cloudcode-pa.googleapis.com'
const QUOTA_API_BASE = 'https://daily-cloudcode-pa.googleapis.com'
const QUOTA_OS = process.platform === 'win32' ? 'windows' : process.platform
const QUOTA_ARCH = process.arch === 'x64' ? 'amd64' : process.arch
const QUOTA_USER_AGENT = `antigravity/cli/1.0.11 ${QUOTA_OS}/${QUOTA_ARCH}`

const QUOTA_BUCKETS = [
  { id: 'gemini-5h', label: 'Gemini 5-hour' },
  { id: 'gemini-weekly', label: 'Gemini weekly' },
  { id: '3p-5h', label: 'Claude/GPT 5-hour' },
  { id: '3p-weekly', label: 'Claude/GPT weekly' }
] as const

const QUOTA_BUCKET_LABELS = new Map<string, string>(QUOTA_BUCKETS.map(({ id, label }) => [id, label]))
const QUOTA_BUCKET_ORDER = new Map<string, number>(QUOTA_BUCKETS.map(({ id }, index) => [id, index]))

const SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ')

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface UserInfo {
  id: string
  email: string
  name: string
  picture?: string
}

interface LoginResult {
  success: boolean
  account?: any
  error?: string
}

interface PendingLogin {
  resolve: (result: LoginResult) => void
  server: Server
  timeoutId: NodeJS.Timeout
  resolved: boolean
}

function parseQuotaSummary(data: unknown): ModelQuota[] {
  if (!data || typeof data !== 'object') return []

  const root = data as { response?: unknown; summary?: unknown; groups?: unknown }
  const payload = root.response && typeof root.response === 'object'
    ? root.response
    : root.summary && typeof root.summary === 'object'
      ? root.summary
      : root
  const groups = (payload as { groups?: unknown }).groups
  if (!Array.isArray(groups)) return []

  const quotas = new Map<string, ModelQuota>()

  for (const groupValue of groups) {
    if (!groupValue || typeof groupValue !== 'object') continue

    const group = groupValue as { displayName?: unknown; buckets?: unknown }
    if (!Array.isArray(group.buckets)) continue

    for (const bucketValue of group.buckets) {
      if (!bucketValue || typeof bucketValue !== 'object') continue

      const bucket = bucketValue as {
        bucketId?: unknown
        displayName?: unknown
        disabled?: unknown
        remainingFraction?: unknown
        remaining?: unknown
        resetTime?: unknown
      }
      const bucketId = typeof bucket.bucketId === 'string' ? bucket.bucketId.trim() : ''
      const remaining = bucket.remaining && typeof bucket.remaining === 'object'
        ? bucket.remaining as { remainingFraction?: unknown; case?: unknown; value?: unknown }
        : null
      const remainingFraction = bucket.remainingFraction
        ?? remaining?.remainingFraction
        ?? (remaining?.case === 'remainingFraction' ? remaining.value : undefined)

      if (bucket.disabled === true
        || !bucketId
        || typeof remainingFraction !== 'number'
        || !Number.isFinite(remainingFraction)) {
        continue
      }

      const groupName = typeof group.displayName === 'string' ? group.displayName.trim() : ''
      const bucketName = typeof bucket.displayName === 'string' ? bucket.displayName.trim() : ''
      const modelName = QUOTA_BUCKET_LABELS.get(bucketId)
        || [groupName, bucketName].filter(Boolean).join(' · ')
        || bucketId
      const quota: ModelQuota = {
        modelName,
        remainingFraction: Math.max(0, Math.min(1, remainingFraction)),
        resetTime: typeof bucket.resetTime === 'string' && bucket.resetTime.trim()
          ? bucket.resetTime
          : undefined
      }
      const existing = quotas.get(bucketId)

      if (!existing || quota.remainingFraction < existing.remainingFraction) {
        quotas.set(bucketId, quota)
      }
    }
  }

  return Array.from(quotas.entries())
    .sort(([leftId], [rightId]) => {
      const leftOrder = QUOTA_BUCKET_ORDER.get(leftId) ?? Number.MAX_SAFE_INTEGER
      const rightOrder = QUOTA_BUCKET_ORDER.get(rightId) ?? Number.MAX_SAFE_INTEGER
      return leftOrder - rightOrder || leftId.localeCompare(rightId)
    })
    .map(([, quota]) => quota)
}

export class AntigravityService {
  private currentLogin: PendingLogin | null = null

  private finishLogin(resolveRef: PendingLogin['resolve'], result: LoginResult): void {
    const pendingLogin = this.currentLogin

    if (!pendingLogin || pendingLogin.resolve !== resolveRef || pendingLogin.resolved) {
      return
    }

    pendingLogin.resolved = true
    clearTimeout(pendingLogin.timeoutId)
    this.currentLogin = null

    if (pendingLogin.server.listening) {
      pendingLogin.server.close(() => {
        pendingLogin.resolve(result)
      })
      return
    }

    pendingLogin.resolve(result)
  }

  cancelLogin(): boolean {
    if (!this.currentLogin) {
      return false
    }

    const { resolve } = this.currentLogin
    this.finishLogin(resolve, { success: false, error: 'Login cancelled' })
    return true
  }

  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url')
  }

  private generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url')
  }

  private generateState(): string {
    return randomBytes(32).toString('hex')
  }

  async login(): Promise<LoginResult> {
    if (this.currentLogin) {
      return { success: false, error: 'Login already in progress' }
    }

    return new Promise((resolve) => {
      const state = this.generateState()
      const codeVerifier = this.generateCodeVerifier()
      const codeChallenge = this.generateCodeChallenge(codeVerifier)

      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url || '', `http://127.0.0.1`)
        
        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code')
          const returnedState = url.searchParams.get('state')
          const error = url.searchParams.get('error')

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Login Failed</h1><p>You can close this window.</p></body></html>')
            this.finishLogin(resolve, { success: false, error })
            return
          }

          if (returnedState !== state) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Security Error</h1><p>State mismatch. Please try again.</p></body></html>')
            this.finishLogin(resolve, { success: false, error: 'State mismatch' })
            return
          }

          if (!code) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Error</h1><p>No authorization code received.</p></body></html>')
            this.finishLogin(resolve, { success: false, error: 'No authorization code' })
            return
          }

          try {
            const port = (server.address() as AddressInfo).port
            const redirectUri = `http://127.0.0.1:${port}/callback`
            
            const tokens = await this.exchangeCode(code, redirectUri, codeVerifier)
            const userInfo = await this.getUserInfo(tokens.access_token)
            const projectId = await this.getProjectId(tokens.access_token)

            const account = {
              id: userInfo.id,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiresAt: Date.now() + (tokens.expires_in * 1000),
              projectId,
              showInOverview: true,
              selectedModels: []
            }

            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Login Successful</h1><p>You can close this window.</p></body></html>')
            this.finishLogin(resolve, { success: true, account })
          } catch (err) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Error</h1><p>Failed to complete login.</p></body></html>')
            this.finishLogin(resolve, { success: false, error: String(err) })
          }
        }
      })

      const timeoutId = setTimeout(() => {
        this.finishLogin(resolve, { success: false, error: 'Login timeout' })
      }, 60000)

      this.currentLogin = {
        resolve,
        server,
        timeoutId,
        resolved: false
      }

      server.listen(0, '127.0.0.1', () => {
        const port = (server.address() as AddressInfo).port
        const redirectUri = `http://127.0.0.1:${port}/callback`

        const authUrl = new URL(AUTH_URL)
        authUrl.searchParams.set('client_id', CLIENT_ID)
        authUrl.searchParams.set('redirect_uri', redirectUri)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('scope', SCOPES)
        authUrl.searchParams.set('state', state)
        authUrl.searchParams.set('code_challenge', codeChallenge)
        authUrl.searchParams.set('code_challenge_method', 'S256')
        authUrl.searchParams.set('access_type', 'offline')
        authUrl.searchParams.set('prompt', 'consent')

        void shell.openExternal(authUrl.toString()).catch((error) => {
          this.finishLogin(resolve, { success: false, error: String(error) })
        })
      })

      server.on('error', (error) => {
        this.finishLogin(resolve, {
          success: false,
          error: `Failed to start callback server: ${error.message}`
        })
      })
    })
  }

  private async exchangeCode(code: string, redirectUri: string, codeVerifier: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier
    })

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`)
    }

    return response.json()
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
    try {
      const body = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })

      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })

      if (!response.ok) return null

      const data = await response.json()
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000)
      }
    } catch (error) {
      console.error('[Antigravity] Failed to refresh token:', error)
      return null
    }
  }

  private async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(USERINFO_URL, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status}`)
    }

    return response.json()
  }

  private async getProjectId(accessToken: string): Promise<string> {
    const response = await fetch(`${API_BASE}/v1internal:loadCodeAssist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Antigravity/1.11'
      },
      body: JSON.stringify({ metadata: { ideType: 'ANTIGRAVITY' } })
    })

    if (!response.ok) {
      throw new Error(`Failed to load code assist: ${response.status}`)
    }

    const data = await response.json()
    return data.cloudaicompanionProject || ''
  }

  async fetchUsage(account: { accessToken: string; projectId: string }): Promise<ModelQuota[]> {
    const body = JSON.stringify(account.projectId ? { project: account.projectId } : {})
    const summaryRequest: RequestInit = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': QUOTA_USER_AGENT
      },
      body
    }

    for (const baseUrl of [QUOTA_API_BASE, API_BASE]) {
      try {
        const response = await fetchWithTimeout(`${baseUrl}/v1internal:retrieveUserQuotaSummary`, summaryRequest)
        if (!response.ok) continue

        const quotas = parseQuotaSummary(await response.json())
        if (quotas.length > 0) return quotas
      } catch {
        // Fall back to the legacy per-model quota response below.
      }
    }

    return this.fetchLegacyUsage(account, body)
  }

  private async fetchLegacyUsage(
    account: { accessToken: string; projectId: string },
    body: string
  ): Promise<ModelQuota[]> {
    const response = await fetchWithTimeout(`${API_BASE}/v1internal:fetchAvailableModels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Antigravity/1.11'
      },
      body
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`)
    }

    const data = await response.json()
    const dedupMap = new Map<string, ModelQuota>()

    if (data.models && typeof data.models === 'object') {
      for (const [modelName, modelData] of Object.entries(data.models)) {
        const lowerName = modelName.toLowerCase()

        if (lowerName.includes('gemini') || lowerName.includes('claude') || lowerName.includes('gpt')) {
          const model = modelData as any
          const quotaInfo = model.quotaInfo || {}
          const displayName = model.displayName || modelName
          const remainingFraction = quotaInfo.remainingFraction

          if (typeof remainingFraction !== 'number' || !Number.isFinite(remainingFraction)) {
            continue
          }

          const existing = dedupMap.get(displayName)
          if (!existing || remainingFraction < existing.remainingFraction) {
            dedupMap.set(displayName, {
              modelName: displayName,
              remainingFraction: Math.max(0, Math.min(1, remainingFraction)),
              resetTime: quotaInfo.resetTime
            })
          }
        }
      }
    }

    const models = Array.from(dedupMap.values())

    // Sort models by name to ensure consistent ordering across refreshes
    models.sort((a, b) => a.modelName.localeCompare(b.modelName))

    return models
  }
}
