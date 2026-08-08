import { BrowserWindow, session, type Session } from 'electron'
import { createHash } from 'crypto'
import type { OllamaCloudAccount, OllamaCloudLimit, OllamaCloudUsage } from '@shared/types'
import { fetchWithTimeout } from './fetchWithTimeout'

const OLLAMA_URL = 'https://ollama.com'
const SETTINGS_URL = `${OLLAMA_URL}/settings`
export const OLLAMA_CLOUD_AUTH_PARTITION = 'persist:ollama-cloud-auth'
const LOGIN_TIMEOUT = 300000
const DEFAULT_COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000

interface LoginResult {
  success: boolean
  account?: OllamaCloudAccount
  error?: string
}

interface PendingLogin {
  resolve: (result: LoginResult) => void
  window: BrowserWindow
  timeoutId: NodeJS.Timeout
  resolved: boolean
}

interface CookieData {
  cookieHeader: string
  expiresAt: number
}

interface SettingsResponse {
  ok: boolean
  status: number
  text: string
  authExpired: boolean
}

function textContent(html: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
  }

  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39);/g, entity => entities[entity] || entity)
    .replace(/\s+/g, ' ')
    .trim()
}

function extractLimit(html: string, label: 'Session' | 'Weekly', type: OllamaCloudLimit['type']): OllamaCloudLimit | null {
  const start = html.indexOf(`${label} usage`)
  if (start < 0) return null

  const section = html.slice(start, start + 5000)
  const percent = new RegExp(`${label} usage\\s+([0-9]+(?:\\.[0-9]+)?)%\\s+used`, 'i').exec(textContent(section))
  if (!percent) return null

  const used = Math.min(Math.max(Number(percent[1]), 0), 100)
  const resetTime = /data-time=["']([^"']+)["']/i.exec(section)?.[1]

  return {
    type,
    used,
    limit: 100,
    remaining: Math.max(100 - used, 0),
    percentage: used,
    resetTime,
    unit: 'percent',
    unlimited: false
  }
}

export function parseOllamaCloudUsage(html: string): OllamaCloudUsage | null {
  const limits = [
    extractLimit(html, 'Session', 'session'),
    extractLimit(html, 'Weekly', 'weekly')
  ].filter((limit): limit is OllamaCloudLimit => limit !== null)

  if (limits.length === 0) return null

  const plan = /<span[^>]*>\s*Cloud usage\s*<\/span>\s*<span[^>]*>([^<]+)<\/span>/i.exec(html)?.[1]
  return {
    plan: plan ? textContent(plan) : undefined,
    limits
  }
}

function parseEmail(html: string): string | null {
  const value = /<h2[^>]*id=["']header-email["'][^>]*>([\s\S]*?)<\/h2>/i.exec(html)?.[1]
  const email = value ? textContent(value) : ''
  return email.includes('@') ? email : null
}

export class OllamaCloudService {
  private currentLogin: PendingLogin | null = null

  private get authSession(): Session {
    return session.fromPartition(OLLAMA_CLOUD_AUTH_PARTITION)
  }

  private finishLogin(resolveRef: PendingLogin['resolve'], result: LoginResult): void {
    const pendingLogin = this.currentLogin
    if (!pendingLogin || pendingLogin.resolve !== resolveRef || pendingLogin.resolved) return

    pendingLogin.resolved = true
    clearTimeout(pendingLogin.timeoutId)
    this.currentLogin = null

    if (!pendingLogin.window.isDestroyed()) pendingLogin.window.close()
    pendingLogin.resolve(result)
  }

  cancelLogin(): boolean {
    if (!this.currentLogin) return false

    const { resolve } = this.currentLogin
    this.finishLogin(resolve, { success: false, error: 'Login cancelled' })
    return true
  }

  async login(): Promise<LoginResult> {
    if (this.currentLogin) return { success: false, error: 'Login already in progress' }

    return new Promise((resolve) => {
      const authWindow = new BrowserWindow({
        width: 960,
        height: 760,
        title: 'Sign in to Ollama Cloud',
        autoHideMenuBar: true,
        webPreferences: {
          partition: OLLAMA_CLOUD_AUTH_PARTITION,
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      })

      const timeoutId = setTimeout(() => {
        this.finishLogin(resolve, { success: false, error: 'Login timeout' })
      }, LOGIN_TIMEOUT)

      this.currentLogin = { resolve, window: authWindow, timeoutId, resolved: false }

      const tryCompleteLogin = async (): Promise<void> => {
        if (!this.currentLogin || this.currentLogin.resolve !== resolve || this.currentLogin.resolved) return

        try {
          const cookieData = await this.getCookieData()
          if (!cookieData.cookieHeader) return

          const response = await this.requestSettings(cookieData.cookieHeader)
          const email = response.ok ? parseEmail(response.text) : null
          if (!email || !parseOllamaCloudUsage(response.text)) return

          this.finishLogin(resolve, {
            success: true,
            account: {
              id: createHash('sha256').update(email.toLowerCase()).digest('hex'),
              displayName: email,
              email,
              cookieHeader: cookieData.cookieHeader,
              expiresAt: cookieData.expiresAt,
              showInOverview: true
            }
          })
        } catch (error) {
          this.finishLogin(resolve, { success: false, error: String(error) })
        }
      }

      authWindow.webContents.setWindowOpenHandler(({ url }) => {
        void authWindow.loadURL(url)
        return { action: 'deny' }
      })
      authWindow.webContents.on('did-navigate', () => void tryCompleteLogin())
      authWindow.webContents.on('did-navigate-in-page', () => void tryCompleteLogin())
      authWindow.webContents.on('did-finish-load', () => void tryCompleteLogin())
      authWindow.on('closed', () => {
        this.finishLogin(resolve, { success: false, error: 'Login cancelled' })
      })

      void Promise.all([
        this.authSession.clearStorageData(),
        this.authSession.clearCache()
      ])
        .then(() => authWindow.loadURL(SETTINGS_URL))
        .catch(error => this.finishLogin(resolve, { success: false, error: String(error) }))
    })
  }

  async fetchUsage(account: Pick<OllamaCloudAccount, 'cookieHeader'>): Promise<OllamaCloudUsage> {
    const response = await this.requestSettings(account.cookieHeader)

    if (response.authExpired) throw new Error('Ollama Cloud session expired; sign in again')
    if (!response.ok) throw new Error(`Failed to fetch Ollama Cloud usage: ${response.status}`)

    const usage = parseOllamaCloudUsage(response.text)
    if (!usage) throw new Error('Invalid Ollama Cloud usage response')
    return usage
  }

  private async getCookieData(): Promise<CookieData> {
    const cookies = await this.authSession.cookies.get({ url: OLLAMA_URL })
    const expirationDate = Math.min(
      ...cookies
        .map(cookie => cookie.expirationDate)
        .filter((value): value is number => typeof value === 'number' && value > 0)
    )

    return {
      cookieHeader: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; '),
      expiresAt: Number.isFinite(expirationDate)
        ? expirationDate * 1000
        : Date.now() + DEFAULT_COOKIE_TTL_MS
    }
  }

  private async requestSettings(cookieHeader: string): Promise<SettingsResponse> {
    const response = await fetchWithTimeout(SETTINGS_URL, {
      redirect: 'manual',
      headers: {
        'Accept': 'text/html,*/*',
        'Cookie': cookieHeader,
        'Referer': SETTINGS_URL
      }
    })
    const text = await response.text().catch(() => '')
    const location = response.headers.get('location') || ''

    return {
      ok: response.ok,
      status: response.status,
      text,
      authExpired: response.status === 401 || response.status === 403 || /\/signin(?:[/?#]|$)/i.test(location)
    }
  }
}
