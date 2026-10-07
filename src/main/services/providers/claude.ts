import { execFile } from 'child_process'
import { randomUUID } from 'crypto'
import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import type { ClaudeAccount, ClaudeLimit, ClaudeLoginResult, ClaudeUsage } from '@shared/types'
import { fetchWithTimeout } from './fetchWithTimeout'

const API_URL = 'https://api.anthropic.com/api/oauth'
const KEYCHAIN_SERVICE = 'Claude Code-credentials'
// ponytail: the usage endpoint rate-limits after a handful of calls, so successful results are reused.
const MIN_FETCH_INTERVAL_MS = 5 * 60 * 1000
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000

interface ClaudeCredentials {
  accessToken: string
  expiresAt?: number
  scopes?: string[]
  subscriptionType?: string
  rateLimitTier?: string
}

type CredentialsReader = () => Promise<string | null>

function readKeychain(): Promise<string | null> {
  return new Promise(resolve => {
    execFile(
      '/usr/bin/security',
      ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-w'],
      { timeout: 10_000 },
      (error, stdout) => resolve(error ? null : stdout.trim() || null)
    )
  })
}

// Claude Code owns these credentials: they are only ever read, never refreshed or rewritten here.
async function readLocalCredentials(): Promise<string | null> {
  if (process.platform === 'darwin') {
    const stored = await readKeychain()
    if (stored) return stored
  }

  const configDir = process.env['CLAUDE_CONFIG_DIR'] || join(homedir(), '.claude')
  try {
    return await readFile(join(configDir, '.credentials.json'), 'utf8')
  } catch {
    return null
  }
}

export class ClaudeService {
  private cache: { accessToken: string; fetchedAt: number; usage: ClaudeUsage } | null = null
  private blockedUntil = 0

  constructor(private readonly readCredentials: CredentialsReader = readLocalCredentials) {}

  async login(existing?: ClaudeAccount): Promise<ClaudeLoginResult> {
    try {
      const credentials = await this.loadCredentials()
      const email = await this.fetchEmail(credentials.accessToken)
      return {
        success: true,
        account: {
          id: existing?.id ?? randomUUID(),
          displayName: existing?.displayName ?? 'Claude',
          showInOverview: existing?.showInOverview ?? true,
          email: email ?? existing?.email ?? '',
          ...(credentials.subscriptionType ? { subscriptionType: credentials.subscriptionType } : {})
        }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  async fetchUsage(): Promise<ClaudeUsage> {
    const credentials = await this.loadCredentials()
    const now = Date.now()
    const cached = this.cache?.accessToken === credentials.accessToken ? this.cache : null
    if (cached && (now - cached.fetchedAt < MIN_FETCH_INTERVAL_MS || now < this.blockedUntil)) {
      return cached.usage
    }
    if (now < this.blockedUntil) throw new Error('Claude usage API is rate limited. Retrying later.')
    if (credentials.expiresAt && credentials.expiresAt <= now) {
      throw new Error('Claude Code login expired. Open Claude Code to renew it.')
    }

    const response = await this.request('usage', credentials.accessToken)
    if (response.status === 429) {
      this.blockedUntil = now + getRetryAfterMs(response.headers.get('retry-after'), now)
      if (cached) return cached.usage
      throw new Error('Claude usage API is rate limited. Retrying later.')
    }
    if (response.status === 401) {
      throw new Error('Claude Code login was rejected (401). Open Claude Code to renew it.')
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

    const plan = formatPlan(credentials.subscriptionType, credentials.rateLimitTier)
    const usage: ClaudeUsage = { ...(plan ? { plan } : {}), limits: toLimits(data) }
    this.cache = { accessToken: credentials.accessToken, fetchedAt: now, usage }
    return usage
  }

  private async loadCredentials(): Promise<ClaudeCredentials> {
    const raw = await this.readCredentials()
    let parsed: unknown = null
    try {
      parsed = raw ? JSON.parse(raw) : null
    } catch {
      parsed = null
    }

    // Claude Code may store only MCP tokens, which means no Claude account is signed in.
    const oauth = isRecord(parsed) ? parsed.claudeAiOauth : null
    if (!isRecord(oauth) || typeof oauth.accessToken !== 'string' || !oauth.accessToken) {
      throw new Error('Claude Code credentials not found. Sign in with Claude Code first (run "claude" and use /login).')
    }

    const scopes = Array.isArray(oauth.scopes)
      ? oauth.scopes.filter((scope): scope is string => typeof scope === 'string')
      : undefined
    if (scopes && !scopes.includes('user:profile')) throw new Error(SCOPE_ERROR)

    return {
      accessToken: oauth.accessToken,
      ...(typeof oauth.expiresAt === 'number' ? { expiresAt: oauth.expiresAt } : {}),
      ...(scopes ? { scopes } : {}),
      ...(typeof oauth.subscriptionType === 'string' ? { subscriptionType: oauth.subscriptionType } : {}),
      ...(typeof oauth.rateLimitTier === 'string' ? { rateLimitTier: oauth.rateLimitTier } : {})
    }
  }

  private async fetchEmail(accessToken: string): Promise<string | null> {
    try {
      const response = await this.request('profile', accessToken)
      if (!response.ok) return null
      const data: unknown = await response.json()
      const account = isRecord(data) ? data.account : null
      if (!isRecord(account)) return null
      const email = account.email ?? account.email_address
      return typeof email === 'string' && email ? email : null
    } catch {
      return null
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

const SCOPE_ERROR = 'Claude Code login lacks the user:profile scope. Run "claude logout" and "claude login" again.'

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
