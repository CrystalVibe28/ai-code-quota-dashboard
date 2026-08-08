import { createHash, randomBytes } from 'crypto'
import { shell } from 'electron'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import type { AddressInfo } from 'net'
import { fetchWithTimeout } from './fetchWithTimeout'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const BASE_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
]

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}

interface TokenErrorResponse {
  error?: string
  error_description?: string
  error_subtype?: string
}

interface UserInfo {
  id: string
  email: string
  name: string
  picture?: string
}

export interface GoogleOAuthAccount {
  userId: string
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface GoogleOAuthResult {
  success: boolean
  account?: GoogleOAuthAccount
  error?: string
}

interface PendingLogin {
  resolve: (result: GoogleOAuthResult) => void
  server: Server
  timeoutId: NodeJS.Timeout
  resolved: boolean
}

export function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString('base64url')
  return {
    codeVerifier,
    codeChallenge: createHash('sha256').update(codeVerifier).digest('base64url')
  }
}

export class GoogleOAuthService {
  private currentLogin: PendingLogin | null = null

  constructor(
    private readonly clientId: string,
    private readonly clientSecret = '',
    private readonly additionalScopes: string[] = []
  ) {}

  private finishLogin(resolveRef: PendingLogin['resolve'], result: GoogleOAuthResult): void {
    const pending = this.currentLogin
    if (!pending || pending.resolve !== resolveRef || pending.resolved) return

    pending.resolved = true
    clearTimeout(pending.timeoutId)
    this.currentLogin = null

    if (pending.server.listening) {
      pending.server.close(() => pending.resolve(result))
      return
    }
    pending.resolve(result)
  }

  cancelLogin(): boolean {
    if (!this.currentLogin) return false
    this.finishLogin(this.currentLogin.resolve, { success: false, error: 'Login cancelled' })
    return true
  }

  async login(): Promise<GoogleOAuthResult> {
    if (!this.clientId) return { success: false, error: 'Google OAuth client is not configured' }
    if (this.currentLogin) return { success: false, error: 'Login already in progress' }

    return new Promise((resolve) => {
      const state = randomBytes(32).toString('hex')
      const { codeVerifier, codeChallenge } = createPkcePair()

      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url || '', 'http://127.0.0.1')
        if (url.pathname !== '/callback') {
          res.writeHead(404).end()
          return
        }

        const error = url.searchParams.get('error')
        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<html><body><h1>Login Failed</h1><p>You can close this window.</p></body></html>')
          this.finishLogin(resolve, { success: false, error })
          return
        }

        if (url.searchParams.get('state') !== state) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<html><body><h1>Security Error</h1><p>State mismatch. Please try again.</p></body></html>')
          this.finishLogin(resolve, { success: false, error: 'State mismatch' })
          return
        }

        const code = url.searchParams.get('code')
        if (!code) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<html><body><h1>Error</h1><p>No authorization code received.</p></body></html>')
          this.finishLogin(resolve, { success: false, error: 'No authorization code' })
          return
        }

        try {
          const port = (server.address() as AddressInfo).port
          const tokens = await this.exchangeCode(code, `http://127.0.0.1:${port}/callback`, codeVerifier)
          const user = await this.getUserInfo(tokens.access_token)
          if (!tokens.refresh_token) throw new Error('Google did not return a refresh token')

          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<html><body><h1>Login Successful</h1><p>You can close this window.</p></body></html>')
          this.finishLogin(resolve, {
            success: true,
            account: {
              userId: user.id,
              email: user.email,
              name: user.name,
              picture: user.picture,
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiresAt: Date.now() + tokens.expires_in * 1000
            }
          })
        } catch (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<html><body><h1>Error</h1><p>Failed to complete login.</p></body></html>')
          this.finishLogin(resolve, { success: false, error: String(error) })
        }
      })

      const timeoutId = setTimeout(() => {
        this.finishLogin(resolve, { success: false, error: 'Login timeout' })
      }, 60000)

      this.currentLogin = { resolve, server, timeoutId, resolved: false }
      server.listen(0, '127.0.0.1', () => {
        const port = (server.address() as AddressInfo).port
        const authUrl = new URL(AUTH_URL)
        authUrl.searchParams.set('client_id', this.clientId)
        authUrl.searchParams.set('redirect_uri', `http://127.0.0.1:${port}/callback`)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('scope', [...BASE_SCOPES, ...this.additionalScopes].join(' '))
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
        this.finishLogin(resolve, { success: false, error: `Failed to start callback server: ${error.message}` })
      })
    })
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
    if (!this.clientId) throw new Error('Google OAuth client is not configured')

    const body = new URLSearchParams({
      client_id: this.clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
    if (this.clientSecret) body.set('client_secret', this.clientSecret)

    const response = await fetchWithTimeout(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
    if (!response.ok) {
      const error = await response.json().catch(() => null) as TokenErrorResponse | null
      const detail = [error?.error, error?.error_subtype, error?.error_description].filter(Boolean).join(': ')
      throw new Error(`Token refresh failed: ${response.status}${detail ? ` (${detail})` : ''}`)
    }

    const data = await response.json() as TokenResponse
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000
    }
  }

  private async exchangeCode(code: string, redirectUri: string, codeVerifier: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier
    })
    if (this.clientSecret) body.set('client_secret', this.clientSecret)

    const response = await fetchWithTimeout(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
    if (!response.ok) {
      const error = await response.json().catch(() => null) as TokenErrorResponse | null
      const detail = [error?.error, error?.error_description].filter(Boolean).join(': ')
      throw new Error(`Token exchange failed: ${response.status}${detail ? ` (${detail})` : ''}`)
    }
    return response.json() as Promise<TokenResponse>
  }

  private async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetchWithTimeout(USERINFO_URL, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    if (!response.ok) throw new Error(`Failed to get user info: ${response.status}`)
    return response.json() as Promise<UserInfo>
  }
}
