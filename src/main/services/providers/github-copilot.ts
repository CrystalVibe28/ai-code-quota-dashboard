import { createServer, IncomingMessage, ServerResponse } from 'http'
import { shell } from 'electron'
import { randomBytes, createHash } from 'crypto'

const CLIENT_ID = '01ab8ac9400c4e429b23'
const CLIENT_SECRET = '2af589bb2ffd03a29cc0df83f767e3f6693f14cd'
const REDIRECT_URI = 'https://vscode.dev/redirect'
const AUTH_URL = 'https://github.com/login/oauth/select_account'
const TOKEN_URL = 'https://github.com/login/oauth/access_token'
const USERINFO_URL = 'https://api.github.com/user'
const API_URL = 'https://api.github.com/copilot_internal/user'

const SCOPE = 'user:email'
const LOCAL_PORT = 8000

interface TokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  scope: string
}

interface UserInfo {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
}

interface QuotaSnapshot {
  entitlement: number
  remaining: number
  percent_remaining: number
  unlimited: boolean
}

interface CopilotUsage {
  accessTypeSku: string
  copilotPlan: string
  quotaResetDate: string
  quotaSnapshots: Record<string, QuotaSnapshot>
}

// Raw API response types
interface LimitedUserQuotas {
  chat?: number
  completions?: number
}

interface MonthlyQuotas {
  chat?: number
  completions?: number
}

interface RawQuotaSnapshot {
  entitlement: number
  remaining: number
  percent_remaining: number
  unlimited: boolean
}

interface CopilotApiResponse {
  access_type_sku?: string
  copilot_plan?: string
  // Free Limited user fields
  limited_user_quotas?: LimitedUserQuotas
  monthly_quotas?: MonthlyQuotas
  limited_user_reset_date?: string
  // Paid user fields
  quota_snapshots?: Record<string, RawQuotaSnapshot>
  quota_reset_date?: string
}

export class GithubCopilotService {
  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url')
  }

  private generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url')
  }

  private generateNonce(length: number = 7): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let raw = ''
    for (let i = 0; i < length; i++) {
      raw += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
    }
    return Buffer.from(raw).toString('base64url')
  }

  async login(): Promise<{ success: boolean; account?: any; error?: string }> {
    return new Promise((resolve) => {
      const codeVerifier = this.generateCodeVerifier()
      const codeChallenge = this.generateCodeChallenge(codeVerifier)
      const nonce = this.generateNonce(7)
      const state = `http://127.0.0.1:${LOCAL_PORT}/callback?nonce=${nonce}`

      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url || '', `http://127.0.0.1:${LOCAL_PORT}`)
        
        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code')
          const returnedState = url.searchParams.get('state')
          const error = url.searchParams.get('error')

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end('<html><body><h1>Login Failed</h1><p>You can close this window.</p></body></html>')
            server.close()
            resolve({ success: false, error })
            return
          }

          if (returnedState !== state) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end('<html><body><h1>Security Error</h1><p>State mismatch. Please try again.</p></body></html>')
            server.close()
            resolve({ success: false, error: 'State mismatch' })
            return
          }

          if (!code) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end('<html><body><h1>Error</h1><p>No authorization code received.</p></body></html>')
            server.close()
            resolve({ success: false, error: 'No authorization code' })
            return
          }

          try {
            const tokens = await this.exchangeCode(code, codeVerifier)
            const userInfo = await this.getUserInfo(tokens.access_token)

            const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

            const account = {
              id: String(userInfo.id),
              login: userInfo.login,
              email: userInfo.email || `${userInfo.login}@users.noreply.github.com`,
              name: userInfo.name || userInfo.login,
              avatarUrl: userInfo.avatar_url,
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token || '',
              expiresAt: Date.now() + ONE_YEAR_MS,
              showInOverview: true,
              selectedQuotas: ['chat', 'completions', 'premium_interactions']
            }

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end('<html><body><h1>Login Successful</h1><p>You can close this window.</p></body></html>')
            server.close()
            resolve({ success: true, account })
          } catch (err) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end('<html><body><h1>Error</h1><p>Failed to complete login.</p></body></html>')
            server.close()
            resolve({ success: false, error: String(err) })
          }
        }
      })

      server.listen(LOCAL_PORT, '127.0.0.1', () => {
        const authUrl = new URL(AUTH_URL)
        authUrl.searchParams.set('client_id', CLIENT_ID)
        authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
        authUrl.searchParams.set('scope', SCOPE)
        authUrl.searchParams.set('state', state)
        authUrl.searchParams.set('code_challenge', codeChallenge)
        authUrl.searchParams.set('code_challenge_method', 'S256')
        authUrl.searchParams.set('prompt', 'select_account')

        shell.openExternal(authUrl.toString())
      })

      setTimeout(() => {
        server.close()
        resolve({ success: false, error: 'Login timeout' })
      }, 180000)
    })
  }

  private async exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier
    })

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error_description || data.error)
    }

    return data
  }

  private async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(USERINFO_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'AI-Code-Quota-Dashboard/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status}`)
    }

    return await response.json()
  }

  async refreshToken(_refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
    return null
  }

  async fetchUsage(accessToken: string): Promise<CopilotUsage | null> {
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (!response.ok) {
        return null
      }

      const data: CopilotApiResponse = await response.json()
      
      let quotaSnapshots: Record<string, QuotaSnapshot> = {}
      let quotaResetDate = ''

      if (data.quota_snapshots && Object.keys(data.quota_snapshots).length > 0) {
        quotaSnapshots = data.quota_snapshots
        quotaResetDate = data.quota_reset_date || ''
      } else if (data.limited_user_quotas && data.monthly_quotas) {
        quotaResetDate = data.limited_user_reset_date || ''
        
        const limitedQuotas = data.limited_user_quotas
        const monthlyQuotas = data.monthly_quotas

        if (monthlyQuotas.chat !== undefined && limitedQuotas.chat !== undefined) {
          const entitlement = monthlyQuotas.chat
          const remaining = limitedQuotas.chat
          quotaSnapshots['chat'] = {
            entitlement,
            remaining,
            percent_remaining: entitlement > 0 ? Math.round((remaining / entitlement) * 100) : 0,
            unlimited: false
          }
        }

        if (monthlyQuotas.completions !== undefined && limitedQuotas.completions !== undefined) {
          const entitlement = monthlyQuotas.completions
          const remaining = limitedQuotas.completions
          quotaSnapshots['completions'] = {
            entitlement,
            remaining,
            percent_remaining: entitlement > 0 ? Math.round((remaining / entitlement) * 100) : 0,
            unlimited: false
          }
        }
      }
      
      const usage: CopilotUsage = {
        accessTypeSku: data.access_type_sku || '',
        copilotPlan: data.copilot_plan || '',
        quotaResetDate,
        quotaSnapshots
      }

      return usage
    } catch (error) {
      console.error('[GitHub Copilot] Failed to fetch usage:', error)
      return null
    }
  }
}
