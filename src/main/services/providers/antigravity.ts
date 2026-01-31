import { createServer, IncomingMessage, ServerResponse } from 'http'
import { shell } from 'electron'
import { randomBytes, createHash } from 'crypto'
import { AddressInfo } from 'net'

const CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com'
const CLIENT_SECRET = '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'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const API_BASE = 'https://cloudcode-pa.googleapis.com'

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

interface ModelQuota {
  modelName: string
  remainingFraction: number
  resetTime?: string
}

export class AntigravityService {
  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url')
  }

  private generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url')
  }

  private generateState(): string {
    return randomBytes(32).toString('hex')
  }

  async login(): Promise<{ success: boolean; account?: any; error?: string }> {
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
            server.close()
            resolve({ success: false, error })
            return
          }

          if (returnedState !== state) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Security Error</h1><p>State mismatch. Please try again.</p></body></html>')
            server.close()
            resolve({ success: false, error: 'State mismatch' })
            return
          }

          if (!code) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Error</h1><p>No authorization code received.</p></body></html>')
            server.close()
            resolve({ success: false, error: 'No authorization code' })
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
            server.close()
            resolve({ success: true, account })
          } catch (err) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Error</h1><p>Failed to complete login.</p></body></html>')
            server.close()
            resolve({ success: false, error: String(err) })
          }
        }
      })

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

        shell.openExternal(authUrl.toString())
      })

      setTimeout(() => {
        server.close()
        resolve({ success: false, error: 'Login timeout' })
      }, 60000)
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
    const response = await fetch(`${API_BASE}/v1internal:fetchAvailableModels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Antigravity/1.11'
      },
      body: JSON.stringify({ project: account.projectId })
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`)
    }

    const data = await response.json()
    const models: ModelQuota[] = []

    if (data.models && typeof data.models === 'object') {
      const modelsMap = data.models
      for (const [modelName, modelData] of Object.entries(modelsMap)) {
        const lowerName = modelName.toLowerCase()
        
        if (lowerName.includes('gemini') || lowerName.includes('claude') || lowerName.includes('gpt')) {
          const model = modelData as any
          const quotaInfo = model.quotaInfo || {}
          
          models.push({
            modelName: model.displayName || modelName,
            remainingFraction: quotaInfo.remainingFraction ?? 0,
            resetTime: quotaInfo.resetTime
          })
        }
      }
    }

    // Sort models by name to ensure consistent ordering across refreshes
    models.sort((a, b) => a.modelName.localeCompare(b.modelName))

    return models
  }
}
