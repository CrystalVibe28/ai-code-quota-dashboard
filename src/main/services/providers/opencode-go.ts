import { BrowserWindow, session, type Session } from 'electron'
import { createHash, randomUUID } from 'crypto'
import type { OpencodeGoAccount, OpencodeGoLimit, OpencodeGoUsage } from '@shared/types'
import { fetchWithTimeout } from './fetchWithTimeout'

const AUTH_URL = 'https://opencode.ai/auth'
const OPENCODE_URL = 'https://opencode.ai'
const SERVER_URL = 'https://opencode.ai/_server'
export const OPENCODE_GO_AUTH_PARTITION = 'persist:opencode-go-auth'
const DEFAULT_SERVER_ID = 'c7389bd0e731f80f49593e5ee53835475f4e28594dd6bd83eb229bab753498cd'
const LOGIN_TIMEOUT = 300000
const DEFAULT_COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000

interface LoginResult {
  success: boolean
  account?: OpencodeGoAccount
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
  hasAuthCookie: boolean
}

interface RawUsageBucket {
  usagePercent: number
  resetInSec?: number
}

interface RawUsageData {
  rollingUsage?: RawUsageBucket
  weeklyUsage?: RawUsageBucket
  monthlyUsage?: RawUsageBucket
}

interface UsageResponse {
  ok: boolean
  status: number
  text: string
  authExpired: boolean
}

export class OpencodeGoService {
  private currentLogin: PendingLogin | null = null
  private serverId = DEFAULT_SERVER_ID

  private get authSession(): Session {
    return session.fromPartition(OPENCODE_GO_AUTH_PARTITION)
  }

  private finishLogin(resolveRef: PendingLogin['resolve'], result: LoginResult): void {
    const pendingLogin = this.currentLogin

    if (!pendingLogin || pendingLogin.resolve !== resolveRef || pendingLogin.resolved) {
      return
    }

    pendingLogin.resolved = true
    clearTimeout(pendingLogin.timeoutId)
    this.currentLogin = null

    if (!pendingLogin.window.isDestroyed()) {
      pendingLogin.window.close()
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

  async login(): Promise<LoginResult> {
    if (this.currentLogin) {
      return { success: false, error: 'Login already in progress' }
    }

    return new Promise((resolve) => {
      const authWindow = new BrowserWindow({
        width: 960,
        height: 760,
        title: 'Sign in to Opencode Go',
        autoHideMenuBar: true,
        webPreferences: {
          partition: OPENCODE_GO_AUTH_PARTITION,
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      })

      const timeoutId = setTimeout(() => {
        this.finishLogin(resolve, { success: false, error: 'Login timeout' })
      }, LOGIN_TIMEOUT)

      this.currentLogin = {
        resolve,
        window: authWindow,
        timeoutId,
        resolved: false
      }

      const tryCompleteLogin = async (): Promise<void> => {
        if (!this.currentLogin || this.currentLogin.resolve !== resolve || this.currentLogin.resolved) {
          return
        }

        try {
          const workspaceId =
            this.extractWorkspaceId(authWindow.webContents.getURL()) ||
            await this.extractWorkspaceIdFromPage(authWindow)

          if (!workspaceId) {
            return
          }

          const cookieData = await this.getCookieData()
          if (!cookieData.hasAuthCookie) {
            return
          }

          const workspaceName = await this.extractWorkspaceName(authWindow)
          const displayName = workspaceName || `Opencode Go ${workspaceId.slice(-6)}`
          const account: OpencodeGoAccount = {
            id: createHash('sha256').update(workspaceId).digest('hex'),
            displayName,
            workspaceId,
            workspaceName,
            cookieHeader: cookieData.cookieHeader,
            expiresAt: cookieData.expiresAt,
            showInOverview: true
          }

          this.finishLogin(resolve, { success: true, account })
        } catch (error) {
          this.finishLogin(resolve, { success: false, error: String(error) })
        }
      }

      authWindow.webContents.setWindowOpenHandler(({ url }) => {
        void authWindow.loadURL(url)
        return { action: 'deny' }
      })

      authWindow.webContents.on('did-navigate', () => {
        void tryCompleteLogin()
      })

      authWindow.webContents.on('did-navigate-in-page', () => {
        void tryCompleteLogin()
      })

      authWindow.webContents.on('did-finish-load', () => {
        void tryCompleteLogin()
      })

      authWindow.on('closed', () => {
        this.finishLogin(resolve, { success: false, error: 'Login cancelled' })
      })

      void Promise.all([
        this.authSession.clearStorageData(),
        this.authSession.clearCache()
      ])
        .then(() => authWindow.loadURL(AUTH_URL))
        .catch(error => this.finishLogin(resolve, { success: false, error: String(error) }))
    })
  }

  async fetchUsage(account: Pick<OpencodeGoAccount, 'cookieHeader' | 'workspaceId' | 'workspaceName'>): Promise<OpencodeGoUsage> {
    let response = await this.requestUsage(account.cookieHeader, account.workspaceId, this.serverId)
    let rawUsage = response.ok ? this.parseUsage(response.text) : null

    if (response.authExpired) {
      throw new Error('Opencode Go session expired')
    }

    if (!rawUsage) {
      const discoveredServerId = await this.discoverServerId(account.cookieHeader, account.workspaceId)
      if (discoveredServerId && discoveredServerId !== this.serverId) {
        this.serverId = discoveredServerId
        response = await this.requestUsage(account.cookieHeader, account.workspaceId, this.serverId)
        rawUsage = response.ok ? this.parseUsage(response.text) : null
      }
    }

    if (response.authExpired) {
      throw new Error('Opencode Go session expired')
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch Opencode Go usage: ${response.status}`)
    }

    if (!rawUsage) {
      throw new Error('Invalid Opencode Go usage response')
    }

    return {
      workspaceId: account.workspaceId,
      workspaceName: account.workspaceName,
      limits: this.toLimits(rawUsage)
    }
  }

  private async getCookieData(): Promise<CookieData> {
    const cookies = await this.authSession.cookies.get({ url: OPENCODE_URL })
    const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
    const authCookie = cookies.find(cookie => cookie.name === 'auth')
    const expirationDate = authCookie?.expirationDate || Math.min(
      ...cookies
        .map(cookie => cookie.expirationDate)
        .filter((value): value is number => typeof value === 'number' && value > 0)
    )

    return {
      cookieHeader,
      expiresAt: Number.isFinite(expirationDate)
        ? expirationDate * 1000
        : Date.now() + DEFAULT_COOKIE_TTL_MS,
      hasAuthCookie: Boolean(authCookie)
    }
  }

  private async requestUsage(cookieHeader: string, workspaceId: string, serverId: string): Promise<UsageResponse> {
    // opencode.ai's /_server is a SolidStart server-function RPC endpoint. It
    // accepts args either as a Seroval-chunked POST body or as a URL-encoded
    // `args` query string on GET. POST requires implementing the Seroval
    // chunked format (`;0x...;...`); every working OSS client uses GET with
    // `?args=<urlencoded>` instead. See solidjs/solid-start fns/handler.ts.
    const args = JSON.stringify({
      t: {
        t: 9,
        i: 0,
        l: 1,
        a: [{ t: 1, s: workspaceId }],
        o: 0
      },
      f: 31,
      m: []
    })

    const url = `${SERVER_URL}?id=${encodeURIComponent(serverId)}&args=${encodeURIComponent(args)}`

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'Accept': '*/*',
        'Cookie': cookieHeader,
        'Origin': OPENCODE_URL,
        'Referer': `${OPENCODE_URL}/workspace/${workspaceId}/go`,
        'X-Server-Id': serverId,
        'X-Server-Instance': `server-fn:${randomUUID()}`
      }
    })

    const text = await response.text().catch(() => '')
    const location = response.headers.get('location') || ''
    const authExpired = location.includes('/auth') || response.headers.get('x-error') === 'true'

    return {
      ok: response.ok && !authExpired,
      status: response.status,
      text,
      authExpired
    }
  }

  private parseUsage(text: string): RawUsageData | null {
    try {
      const parsed = JSON.parse(text)
      const usage = this.findUsageObject(parsed)
      if (usage) return usage
    } catch {
      // Server functions may return serialized payloads rather than plain JSON.
    }

    const unescaped = text.replace(/\\"/g, '"')
    const usage: RawUsageData = {}

    for (const key of ['rollingUsage', 'weeklyUsage', 'monthlyUsage'] as const) {
      const bucket = this.extractBucketFromText(unescaped, key)
      if (bucket) {
        usage[key] = bucket
      }
    }

    return Object.keys(usage).length > 0 ? usage : null
  }

  private findUsageObject(value: unknown, seen = new Set<unknown>()): RawUsageData | null {
    if (!value || typeof value !== 'object' || seen.has(value)) {
      return null
    }

    seen.add(value)
    const record = value as Record<string, unknown>

    if (
      this.isUsageBucket(record.rollingUsage) ||
      this.isUsageBucket(record.weeklyUsage) ||
      this.isUsageBucket(record.monthlyUsage)
    ) {
      return {
        rollingUsage: this.isUsageBucket(record.rollingUsage) ? record.rollingUsage : undefined,
        weeklyUsage: this.isUsageBucket(record.weeklyUsage) ? record.weeklyUsage : undefined,
        monthlyUsage: this.isUsageBucket(record.monthlyUsage) ? record.monthlyUsage : undefined
      }
    }

    for (const child of Object.values(record)) {
      const usage = this.findUsageObject(child, seen)
      if (usage) return usage
    }

    return null
  }

  private isUsageBucket(value: unknown): value is RawUsageBucket {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as RawUsageBucket).usagePercent === 'number'
    )
  }

  private extractBucketFromText(text: string, key: string): RawUsageBucket | null {
    const index = text.indexOf(key)
    if (index < 0) return null

    const slice = text.slice(index, index + 800)
    const usagePercent = this.extractNumber(slice, /usagePercent[^0-9.-]*([0-9]+(?:\.[0-9]+)?)/)
    const resetInSec = this.extractNumber(slice, /resetInSec[^0-9.-]*([0-9]+(?:\.[0-9]+)?)/)

    if (usagePercent === null) {
      return null
    }

    return {
      usagePercent,
      resetInSec: resetInSec ?? undefined
    }
  }

  private extractNumber(text: string, regex: RegExp): number | null {
    const match = regex.exec(text)
    if (!match) return null

    const value = Number(match[1])
    return Number.isFinite(value) ? value : null
  }

  private toLimits(rawUsage: RawUsageData): OpencodeGoLimit[] {
    const entries: Array<{ key: keyof RawUsageData; type: string }> = [
      { key: 'rollingUsage', type: 'rollingUsage' },
      { key: 'weeklyUsage', type: 'weeklyUsage' },
      { key: 'monthlyUsage', type: 'monthlyUsage' }
    ]

    return entries.flatMap(({ key, type }) => {
      const bucket = rawUsage[key]
      if (!bucket) return []

      const used = Math.min(Math.max(bucket.usagePercent, 0), 100)
      return [{
        type,
        used,
        limit: 100,
        remaining: Math.max(100 - used, 0),
        percentage: used,
        resetTime: bucket.resetInSec ? Date.now() + bucket.resetInSec * 1000 : undefined,
        unit: 'percent',
        unlimited: false
      }]
    })
  }

  private extractWorkspaceId(url: string): string | null {
    try {
      const parsed = new URL(url)
      const fromPath = /\/workspace\/([^/?#]+)/.exec(parsed.pathname)
      if (fromPath) return decodeURIComponent(fromPath[1])

      return parsed.searchParams.get('workspace_id') || parsed.searchParams.get('workspaceId')
    } catch {
      return null
    }
  }

  private async extractWorkspaceIdFromPage(window: BrowserWindow): Promise<string | null> {
    if (window.isDestroyed()) return null

    const hrefs = await window.webContents.executeJavaScript(`
      Array.from(document.querySelectorAll('a[href]')).map((link) => link.href)
    `).catch(() => []) as string[]

    for (const href of hrefs) {
      const workspaceId = this.extractWorkspaceId(href)
      if (workspaceId) return workspaceId
    }

    return null
  }

  private async extractWorkspaceName(window: BrowserWindow): Promise<string | undefined> {
    if (window.isDestroyed()) return undefined

    const title = await window.webContents.executeJavaScript('document.title').catch(() => '') as string
    const name = title
      .replace(/\s*[-|]\s*opencode.*$/i, '')
      .trim()

    return name && !/^opencode$/i.test(name) ? name : undefined
  }

  private async discoverServerId(cookieHeader: string, workspaceId: string): Promise<string | null> {
    const pageText = await fetchWithTimeout(`${OPENCODE_URL}/workspace/${workspaceId}/go`, {
      redirect: 'manual',
      headers: {
        'Accept': 'text/html,*/*',
        'Cookie': cookieHeader
      }
    }).then(response => response.text()).catch(() => '')

    const directMatch = this.findServerId(pageText)
    if (directMatch) return directMatch

    const scriptUrls = Array.from(pageText.matchAll(/<script[^>]+src=["']([^"']+)["']/g))
      .map(match => new URL(match[1], OPENCODE_URL).toString())

    for (const scriptUrl of scriptUrls.slice(0, 30)) {
      const scriptText = await fetchWithTimeout(scriptUrl, {
        headers: {
          'Accept': '*/*',
          'Cookie': cookieHeader
        }
      }).then(response => response.text()).catch(() => '')

      const scriptMatch = this.findServerId(scriptText)
      if (scriptMatch) return scriptMatch
    }

    return null
  }

  private findServerId(source: string): string | null {
    const patterns = [
      /lite\.subscription\.get[\s\S]{0,1000}?([a-f0-9]{64})/i,
      /([a-f0-9]{64})[\s\S]{0,1000}?lite\.subscription\.get/i,
      /X-Server-Id["':,\s]+([a-f0-9]{64})/i
    ]

    for (const pattern of patterns) {
      const match = pattern.exec(source)
      if (match) return match[1]
    }

    return null
  }
}
