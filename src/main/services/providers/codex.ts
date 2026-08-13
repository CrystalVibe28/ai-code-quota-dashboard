import { createServer, IncomingMessage, ServerResponse, type Server } from 'http'
import { shell } from 'electron'
import { randomBytes, createHash } from 'crypto'
import { fetchWithTimeout } from './fetchWithTimeout'

const DEFAULT_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
const CLIENT_ID = process.env.CODEX_APP_SERVER_LOGIN_CLIENT_ID?.trim() || DEFAULT_CLIENT_ID
const AUTH_URL = 'https://auth.openai.com/oauth/authorize'
const TOKEN_URL = 'https://auth.openai.com/oauth/token'
const USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage'
const SCOPES = 'openid profile email offline_access api.connectors.read api.connectors.invoke'
const CALLBACK_PORT = 1455
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/auth/callback`
const LOGIN_TIMEOUT = 300000
const CODEX_ORIGINATOR = 'codex_cli_rs'
const CODEX_USER_AGENT = 'codex_cli_rs/1.0 (AI Code Quota Dashboard)'

interface TokenResponse {
  id_token: string
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

interface JwtPayload {
  [key: string]: unknown
  exp?: number
  email?: string
  'https://api.openai.com/auth'?: {
    chatgpt_user_id?: string
    chatgpt_plan_type?: string
    account_id?: string
    organization_id?: string
    chatgpt_account_id?: string
    chatgpt_organization_id?: string
  }
}

interface CodexRateLimitResponse {
    allowed: boolean
    limit_reached: boolean
    primary_window: {
      used_percent: number
      limit_window_seconds: number
      reset_after_seconds: number
      reset_at: number
    } | null
    secondary_window: {
      used_percent: number
      limit_window_seconds: number
      reset_after_seconds: number
      reset_at: number
    } | null
}

interface CodexUsageResponse {
  plan_type: string
  rate_limit: CodexRateLimitResponse | null
  code_review_rate_limit: CodexRateLimitResponse | null
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

export class CodexService {
  private currentLogin: PendingLogin | null = null

  private finishLogin(resolveRef: PendingLogin['resolve'], result: LoginResult): void {
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

  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url')
  }

  private generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url')
  }

  private generateState(): string {
    return randomBytes(32).toString('base64url')
  }

  private parseJwt(token: string): JwtPayload {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid JWT')
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8')
    return JSON.parse(payload)
  }

  private getAccountIdFromTokens(accessPayload: JwtPayload, idPayload: JwtPayload): string {
    const accessAuth = accessPayload['https://api.openai.com/auth']
    if (accessAuth?.chatgpt_account_id) return accessAuth.chatgpt_account_id

    const idAuth = idPayload['https://api.openai.com/auth']
    if (idAuth?.chatgpt_account_id) return idAuth.chatgpt_account_id as string
    if (idAuth?.account_id) return idAuth.account_id

    return ''
  }

  isTokenExpired(expiresAt: number): boolean {
    return expiresAt < Date.now() + 60000
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
        const url = new URL(req.url || '', `http://127.0.0.1:${CALLBACK_PORT}`)

        if (url.pathname === '/auth/callback') {
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
            const tokens = await this.exchangeCode(code, codeVerifier)

            const idPayload = this.parseJwt(tokens.id_token)
            const accessPayload = this.parseJwt(tokens.access_token)
            const authClaim = idPayload['https://api.openai.com/auth']

            const email = idPayload.email || ''
            const planType = authClaim?.chatgpt_plan_type || 'unknown'
            const chatgptAccountId = this.getAccountIdFromTokens(accessPayload, idPayload)
            const organizationId = authClaim?.organization_id || accessPayload['https://api.openai.com/auth']?.organization_id || ''
            const userId = authClaim?.chatgpt_user_id || ''

            const accountIdSource = [email, chatgptAccountId, organizationId].filter(Boolean).join('|')
            const id = userId || createHash('md5').update(accountIdSource).digest('hex')

            const account = {
              id,
              displayName: email,
              email,
              planType,
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              idToken: tokens.id_token,
              expiresAt: Date.now() + (tokens.expires_in * 1000),
              accountId: chatgptAccountId,
              organizationId,
              showInOverview: true
            }

            this.writeCallbackResponse(res, 'Login Successful', 'You can close this window.')
            this.finishLogin(resolve, { success: true, account })
          } catch (err) {
            this.writeCallbackResponse(res, 'Error', 'Failed to complete login.')
            this.finishLogin(resolve, { success: false, error: String(err) })
          }
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

      server.listen(CALLBACK_PORT, '127.0.0.1', () => {
        const authUrl = new URL(AUTH_URL)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('client_id', CLIENT_ID)
        authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
        authUrl.searchParams.set('scope', SCOPES)
        authUrl.searchParams.set('code_challenge', codeChallenge)
        authUrl.searchParams.set('code_challenge_method', 'S256')
        authUrl.searchParams.set('id_token_add_organizations', 'true')
        authUrl.searchParams.set('codex_cli_simplified_flow', 'true')
        authUrl.searchParams.set('state', state)
        authUrl.searchParams.set('originator', CODEX_ORIGINATOR)

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

  private async exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier
    })

    const response = await fetchWithTimeout(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`)
    }

    return response.json()
  }

  async refreshToken(refreshTokenValue: string): Promise<{
    accessToken: string
    refreshToken: string
    idToken: string
    expiresAt: number
    accountId: string
    organizationId: string
    planType: string
  } | null> {
    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
        client_id: CLIENT_ID
      })

      const response = await fetchWithTimeout(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })

      if (!response.ok) return null

      const data: TokenResponse = await response.json()
      const idPayload = this.parseJwt(data.id_token)
      const accessPayload = this.parseJwt(data.access_token)
      const authClaim = idPayload['https://api.openai.com/auth']

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshTokenValue,
        idToken: data.id_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
        accountId: this.getAccountIdFromTokens(accessPayload, idPayload),
        organizationId: authClaim?.organization_id || accessPayload['https://api.openai.com/auth']?.organization_id || '',
        planType: authClaim?.chatgpt_plan_type || 'unknown'
      }
    } catch (error) {
      console.error('[Codex] Failed to refresh token:', error)
      return null
    }
  }

  async fetchUsage(account: { accessToken: string; accountId: string }): Promise<CodexUsageResponse> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'OAI-Product-Sku': 'codex',
      'originator': CODEX_ORIGINATOR,
      'User-Agent': CODEX_USER_AGENT
    }

    if (account.accountId) {
      headers['ChatGPT-Account-ID'] = account.accountId
    }

    const response = await fetchWithTimeout(USAGE_URL, { headers })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Failed to fetch usage: ${response.status} ${text}`)
    }

    return response.json()
  }
}
