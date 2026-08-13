import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { DatabaseSync } from 'node:sqlite'
import { getAntigravityQuotaType } from '@shared/antigravityQuota'
import { getCodexQuotaPeriod } from '@shared/codexQuota'
import { getZaiQuotaType } from '@shared/zaiQuota'
import type {
  AntigravityUsage,
  CachedAccountUsage,
  CodexAccountUsage,
  LocalUsageCache,
  OllamaCloudAccountUsage,
  OpencodeGoAccountUsage,
  ProviderId,
  QuotaHistory,
  QuotaHistoryPeriod,
  ZaiAccountUsage
} from '@shared/types'

interface HistorySample {
  accountId: string
  period: QuotaHistoryPeriod
  seriesKey: string
  remainingBps: number
  resetAt: number | null
}

interface HistoryRow {
  period: QuotaHistoryPeriod
  series_key: string
  sample_hour: number
  remaining_bps: number
  reset_at: number | null
}

interface CacheRow {
  provider: ProviderId
  updated_at: number
  payload: string
}

interface SyncRow {
  account_id: string
  sample_hour: number
  last_attempt_at: number
  attempts: number
  successes: number
  failures: number
  last_success: number
}

interface ProviderCache {
  updatedAt: number
  accounts: CachedAccountUsage[]
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const PROVIDER_SYNC_ACCOUNT_ID = ''
const PROVIDER_IDS: ProviderId[] = [
  'antigravity',
  'githubCopilot',
  'zaiCoding',
  'codex',
  'opencodeGo',
  'ollamaCloud',
  'aiStudio'
]

export class UsageDataService {
  private static instance: UsageDataService
  private cache = new Map<ProviderId, ProviderCache>()
  private cacheLoaded = false
  private deletedAccounts = new Map<string, number>()
  private invalidatedAt = 0

  constructor(
    private readonly databasePath = join(app.getPath('userData'), 'data', 'usage-history.db')
  ) {}

  static getInstance(): UsageDataService {
    if (!UsageDataService.instance) UsageDataService.instance = new UsageDataService()
    return UsageDataService.instance
  }

  recordProvider<T>(
    provider: ProviderId,
    results: T[],
    now = Date.now(),
    startedAt = now
  ): T[] {
    if (startedAt <= this.invalidatedAt) return []

    let filteredDeletedAccount = false
    const activeResults = results.filter(result => {
      if (!result || typeof result !== 'object') return true
      const accountId = (result as { accountId?: unknown }).accountId
      if (typeof accountId !== 'string') return true
      const deletedAt = this.deletedAccounts.get(this.accountKey(provider, accountId))
      const active = deletedAt === undefined || startedAt > deletedAt
      if (!active) filteredDeletedAccount = true
      return active
    })
    if (filteredDeletedAccount && activeResults.length === 0) return []
    const accounts = this.sanitizeResults(activeResults)
    const payload = JSON.stringify(accounts)
    const samples = this.extractSamples(provider, activeResults)

    let database: DatabaseSync | null = null
    try {
      database = this.openDatabase()
      const previousCache = database.prepare(
        'SELECT payload FROM usage_cache WHERE provider = ?'
      ).get(provider) as { payload: string } | undefined
      const cacheChanged = previousCache?.payload !== payload

      const upsertCache = database.prepare(`
        INSERT INTO usage_cache (provider, updated_at, payload)
        VALUES (?, ?, ?)
        ON CONFLICT(provider) DO UPDATE SET
          updated_at = excluded.updated_at,
          payload = excluded.payload
      `)
      const upsertSample = database.prepare(`
        INSERT INTO quota_history (
          provider,
          account_id,
          period,
          series_key,
          sample_hour,
          remaining_bps,
          reset_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider, account_id, period, series_key, sample_hour) DO UPDATE SET
          remaining_bps = excluded.remaining_bps,
          reset_at = excluded.reset_at
        WHERE quota_history.remaining_bps IS NOT excluded.remaining_bps
          OR quota_history.reset_at IS NOT excluded.reset_at
      `)
      const upsertSync = this.prepareSyncUpsert(database)
      const sampleHour = Math.floor(now / HOUR_MS)

      try {
        database.exec('BEGIN')
        if (cacheChanged) upsertCache.run(provider, now, payload)
        this.recordSyncRows(upsertSync, provider, activeResults, sampleHour, now)
        for (const sample of samples) {
          // ponytail: hourly buckets cap write rate; the last successful refresh wins.
          upsertSample.run(
            provider,
            sample.accountId,
            sample.period,
            sample.seriesKey,
            sampleHour,
            sample.remainingBps,
            sample.resetAt
          )
        }
        database.exec('COMMIT')
        this.cache.set(provider, { updatedAt: now, accounts })
      } catch (error) {
        if (database.isTransaction) database.exec('ROLLBACK')
        throw error
      }
    } catch (error) {
      console.error(`[Usage History] Failed to record ${provider}:`, error)
      throw error
    } finally {
      database?.close()
    }
    return activeResults
  }

  recordProviderFailure(
    provider: ProviderId,
    now = Date.now(),
    startedAt = now
  ): void {
    if (startedAt <= this.invalidatedAt) return

    let database: DatabaseSync | null = null
    try {
      database = this.openDatabase()
      this.prepareSyncUpsert(database).run(
        provider,
        PROVIDER_SYNC_ACCOUNT_ID,
        Math.floor(now / HOUR_MS),
        now,
        0,
        1,
        0
      )
    } catch (error) {
      console.error(`[Usage Sync] Failed to record ${provider} failure:`, error)
    } finally {
      database?.close()
    }
  }

  getQuotaHistory(provider: ProviderId, accountId: string, now = Date.now()): QuotaHistory {
    if (!existsSync(this.databasePath)) {
      return { weekly: [], monthly: [], audit: { provider: [], account: [] } }
    }

    const database = this.openDatabase()
    try {
      const oldestHour = Math.floor((now - 32 * DAY_MS) / HOUR_MS)
      const rows = database.prepare(`
        SELECT period, series_key, sample_hour, remaining_bps, reset_at
        FROM quota_history
        WHERE provider = ? AND account_id = ? AND sample_hour >= ?
        ORDER BY sample_hour
      `).all(provider, accountId, oldestHour) as unknown as HistoryRow[]

      const syncRows = database.prepare(`
        SELECT
          account_id,
          sample_hour,
          last_attempt_at,
          attempts,
          successes,
          failures,
          last_success
        FROM usage_sync_history
        WHERE provider = ?
          AND account_id IN (?, ?)
          AND sample_hour >= ?
        ORDER BY account_id, sample_hour
      `).all(provider, PROVIDER_SYNC_ACCOUNT_ID, accountId, oldestHour) as unknown as SyncRow[]

      const history = rows.reduce<Pick<QuotaHistory, 'weekly' | 'monthly'>>((value, row) => {
        const sampledAt = row.sample_hour * HOUR_MS
        if (row.period === 'weekly' && sampledAt < now - 8 * DAY_MS) return value

        value[row.period].push({
          seriesKey: row.series_key,
          sampledAt,
          remaining: row.remaining_bps / 100,
          resetAt: row.reset_at ?? undefined
        })
        return value
      }, { weekly: [], monthly: [] })

      return {
        ...history,
        audit: {
          provider: syncRows
            .filter(row => row.account_id === PROVIDER_SYNC_ACCOUNT_ID)
            .map(row => this.mapSyncRow(row)),
          account: syncRows
            .filter(row => row.account_id === accountId)
            .map(row => this.mapSyncRow(row))
        }
      }
    } finally {
      database.close()
    }
  }

  getCachedUsage(): LocalUsageCache {
    this.loadCache()
    const providers = Object.fromEntries(PROVIDER_IDS.map(provider => [
      provider,
      this.cache.get(provider)?.accounts ?? []
    ])) as LocalUsageCache['providers']
    const timestamps = Array.from(this.cache.values(), value => value.updatedAt)

    return {
      updatedAt: timestamps.length > 0 ? Math.max(...timestamps) : null,
      providers
    }
  }

  deleteAccount(provider: ProviderId, accountId: string): boolean {
    this.deletedAccounts.set(this.accountKey(provider, accountId), Date.now())
    this.loadCache()
    const accounts = (this.cache.get(provider)?.accounts ?? [])
      .filter(account => account.accountId !== accountId)
    const updatedAt = Date.now()
    this.cache.set(provider, { updatedAt, accounts })
    if (!existsSync(this.databasePath)) return true

    let database: DatabaseSync | null = null
    try {
      database = this.openDatabase()
      database.exec('BEGIN')
      try {
        database.prepare(
          'DELETE FROM quota_history WHERE provider = ? AND account_id = ?'
        ).run(provider, accountId)
        database.prepare(
          'DELETE FROM usage_sync_history WHERE provider = ? AND account_id = ?'
        ).run(provider, accountId)
        database.prepare(`
          INSERT INTO usage_cache (provider, updated_at, payload)
          VALUES (?, ?, ?)
          ON CONFLICT(provider) DO UPDATE SET
            updated_at = excluded.updated_at,
            payload = excluded.payload
        `).run(provider, updatedAt, JSON.stringify(accounts))
        database.exec('COMMIT')
        return true
      } catch (error) {
        if (database.isTransaction) database.exec('ROLLBACK')
        throw error
      }
    } catch (error) {
      console.error(`[Usage Data] Failed to delete ${provider}/${accountId}:`, error)
      return false
    } finally {
      database?.close()
    }
  }

  clearMemoryCache(): void {
    this.cache.clear()
    this.cacheLoaded = false
  }

  invalidateAll(): void {
    this.invalidatedAt = Date.now()
    this.deletedAccounts.clear()
    this.clearMemoryCache()
  }

  private openDatabase(): DatabaseSync {
    mkdirSync(dirname(this.databasePath), { recursive: true })
    const database = new DatabaseSync(this.databasePath)
    try {
      database.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA busy_timeout = 3000;
        CREATE TABLE IF NOT EXISTS quota_history (
          provider TEXT NOT NULL,
          account_id TEXT NOT NULL,
          period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly')),
          series_key TEXT NOT NULL,
          sample_hour INTEGER NOT NULL,
          remaining_bps INTEGER NOT NULL CHECK (remaining_bps BETWEEN 0 AND 10000),
          reset_at INTEGER,
          PRIMARY KEY (provider, account_id, period, series_key, sample_hour)
        ) WITHOUT ROWID;
        CREATE TABLE IF NOT EXISTS usage_cache (
          provider TEXT PRIMARY KEY,
          updated_at INTEGER NOT NULL,
          payload TEXT NOT NULL
        ) WITHOUT ROWID;
        CREATE TABLE IF NOT EXISTS usage_sync_history (
          provider TEXT NOT NULL,
          account_id TEXT NOT NULL,
          sample_hour INTEGER NOT NULL,
          last_attempt_at INTEGER NOT NULL,
          attempts INTEGER NOT NULL CHECK (attempts > 0),
          successes INTEGER NOT NULL CHECK (successes >= 0),
          failures INTEGER NOT NULL CHECK (failures >= 0),
          last_success INTEGER NOT NULL CHECK (last_success IN (0, 1)),
          CHECK (attempts = successes + failures),
          PRIMARY KEY (provider, account_id, sample_hour)
        ) WITHOUT ROWID;
        CREATE INDEX IF NOT EXISTS idx_quota_history_account_hour
          ON quota_history (provider, account_id, sample_hour);
      `)
      return database
    } catch (error) {
      database.close()
      throw error
    }
  }

  private loadCache(): void {
    if (this.cacheLoaded) return
    this.cacheLoaded = true
    if (!existsSync(this.databasePath)) return

    let database: DatabaseSync | null = null
    try {
      database = this.openDatabase()
      const rows = database.prepare(
        'SELECT provider, updated_at, payload FROM usage_cache'
      ).all() as unknown as CacheRow[]

      for (const row of rows) {
        if (!PROVIDER_IDS.includes(row.provider) || this.cache.has(row.provider)) continue
        try {
          const accounts = JSON.parse(row.payload)
          if (Array.isArray(accounts)) {
            this.cache.set(row.provider, { updatedAt: row.updated_at, accounts })
          }
        } catch {
          console.error(`[Usage Cache] Ignored invalid cache for ${row.provider}`)
        }
      }
    } catch (error) {
      this.cacheLoaded = false
      console.error('[Usage Cache] Failed to load local cache:', error)
    } finally {
      database?.close()
    }
  }

  private extractSamples(provider: ProviderId, results: unknown[]): HistorySample[] {
    switch (provider) {
      case 'antigravity':
        return this.extractAntigravity(results as AntigravityUsage[])
      case 'zaiCoding':
        return this.extractZai(results as ZaiAccountUsage[])
      case 'codex':
        return this.extractCodex(results as CodexAccountUsage[])
      case 'opencodeGo':
        return this.extractOpencodeGo(results as OpencodeGoAccountUsage[])
      case 'ollamaCloud':
        return this.extractOllamaCloud(results as OllamaCloudAccountUsage[])
      default:
        return []
    }
  }

  private prepareSyncUpsert(database: DatabaseSync) {
    return database.prepare(`
      INSERT INTO usage_sync_history (
        provider,
        account_id,
        sample_hour,
        last_attempt_at,
        attempts,
        successes,
        failures,
        last_success
      ) VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(provider, account_id, sample_hour) DO UPDATE SET
        last_attempt_at = excluded.last_attempt_at,
        attempts = usage_sync_history.attempts + 1,
        successes = usage_sync_history.successes + excluded.successes,
        failures = usage_sync_history.failures + excluded.failures,
        last_success = excluded.last_success
    `)
  }

  private recordSyncRows(
    upsert: ReturnType<UsageDataService['prepareSyncUpsert']>,
    provider: ProviderId,
    results: unknown[],
    sampleHour: number,
    now: number
  ): void {
    const accounts = results.flatMap(result => {
      if (!result || typeof result !== 'object') return []
      const value = result as { accountId?: unknown; usage?: unknown; error?: unknown }
      if (typeof value.accountId !== 'string' || !value.accountId) return []
      return [{
        accountId: value.accountId,
        success: !value.error && value.usage != null
      }]
    })
    const providerSuccess = accounts.length === results.length
      && accounts.every(account => account.success)

    upsert.run(
      provider,
      PROVIDER_SYNC_ACCOUNT_ID,
      sampleHour,
      now,
      providerSuccess ? 1 : 0,
      providerSuccess ? 0 : 1,
      providerSuccess ? 1 : 0
    )
    for (const account of accounts) {
      upsert.run(
        provider,
        account.accountId,
        sampleHour,
        now,
        account.success ? 1 : 0,
        account.success ? 0 : 1,
        account.success ? 1 : 0
      )
    }
  }

  private mapSyncRow(row: SyncRow) {
    return {
      sampledAt: row.sample_hour * HOUR_MS,
      lastAttemptAt: row.last_attempt_at,
      attempts: row.attempts,
      successes: row.successes,
      failures: row.failures,
      lastSuccess: row.last_success === 1
    }
  }

  private accountKey(provider: ProviderId, accountId: string): string {
    return `${provider}:${accountId}`
  }

  private sanitizeResults(results: unknown[]): CachedAccountUsage[] {
    return results.flatMap(result => {
      if (!result || typeof result !== 'object') return []
      const value = result as {
        accountId?: unknown
        name?: unknown
        usage?: unknown
        error?: unknown
      }
      if (typeof value.accountId !== 'string' || !value.accountId || typeof value.name !== 'string') return []

      return [{
        accountId: value.accountId,
        name: value.name,
        usage: value.usage ?? null,
        ...(value.error || value.usage == null ? { error: 'Usage unavailable' } : {})
      }]
    })
  }

  private extractAntigravity(results: AntigravityUsage[]): HistorySample[] {
    return results.flatMap(account => account.usage?.flatMap(quota => {
      const seriesKey = getAntigravityQuotaType(quota.modelName)
      if (seriesKey !== 'geminiWeekly' && seriesKey !== 'claudeGptWeekly') return []

      return [this.sample(
        account.accountId,
        'weekly',
        seriesKey,
        quota.remainingFraction * 100,
        quota.resetTime
      )]
    }) ?? [])
  }

  private extractZai(results: ZaiAccountUsage[]): HistorySample[] {
    return results.flatMap(account => account.usage?.limits.flatMap(limit => (
      getZaiQuotaType(limit) === 'weekly'
        ? [this.sample(
            account.accountId,
            'weekly',
            `${limit.type}:${limit.unit ?? ''}:${limit.number ?? ''}`,
            100 - limit.percentage,
            limit.nextResetTime
          )]
        : []
    )) ?? [])
  }

  private extractCodex(results: CodexAccountUsage[]): HistorySample[] {
    return results.flatMap(account => {
      if (!account.usage) return []

      const windows = [
        ['rateLimit:primary', account.usage.rate_limit?.primary_window],
        ['rateLimit:secondary', account.usage.rate_limit?.secondary_window],
        ['codeReview:primary', account.usage.code_review_rate_limit?.primary_window],
        ['codeReview:secondary', account.usage.code_review_rate_limit?.secondary_window]
      ] as const

      return windows.flatMap(([seriesKey, window]) => {
        if (!window) return []
        const { period } = getCodexQuotaPeriod(window.limit_window_seconds)
        if (period !== 'weekly' && period !== 'monthly') return []

        return [this.sample(
          account.accountId,
          period,
          seriesKey,
          100 - window.used_percent,
          window.reset_at * 1000
        )]
      })
    })
  }

  private extractOpencodeGo(results: OpencodeGoAccountUsage[]): HistorySample[] {
    return results.flatMap(account => account.usage?.limits.flatMap(limit => {
      const period = limit.type === 'weeklyUsage'
        ? 'weekly'
        : limit.type === 'monthlyUsage'
          ? 'monthly'
          : null
      return period
        ? [this.sample(account.accountId, period, limit.type, limit.remaining, limit.resetTime)]
        : []
    }) ?? [])
  }

  private extractOllamaCloud(results: OllamaCloudAccountUsage[]): HistorySample[] {
    return results.flatMap(account => account.usage?.limits.flatMap(limit => (
      limit.type === 'weekly'
        ? [this.sample(
            account.accountId,
            'weekly',
            limit.type,
            limit.remaining,
            limit.resetTime
          )]
        : []
    )) ?? [])
  }

  private sample(
    accountId: string,
    period: QuotaHistoryPeriod,
    seriesKey: string,
    remaining: number,
    resetAt?: string | number
  ): HistorySample {
    return {
      accountId,
      period,
      seriesKey,
      remainingBps: Math.round(Math.min(Math.max(remaining, 0), 100) * 100),
      resetAt: this.normalizeTime(resetAt)
    }
  }

  private normalizeTime(value?: string | number): number | null {
    if (value === undefined) return null

    const timestamp = typeof value === 'number'
      ? (value < 1_000_000_000_000 ? value * 1000 : value)
      : Date.parse(value)
    return Number.isFinite(timestamp)
      ? Math.floor(timestamp / 60000) * 60000
      : null
  }
}
