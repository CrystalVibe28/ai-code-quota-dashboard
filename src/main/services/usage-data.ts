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

interface ProviderCache {
  updatedAt: number
  accounts: CachedAccountUsage[]
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
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

  constructor(
    private readonly databasePath = join(app.getPath('userData'), 'data', 'usage-history.db')
  ) {}

  static getInstance(): UsageDataService {
    if (!UsageDataService.instance) UsageDataService.instance = new UsageDataService()
    return UsageDataService.instance
  }

  recordProvider(provider: ProviderId, results: unknown[], now = Date.now()): void {
    const accounts = this.sanitizeResults(results)
    const payload = JSON.stringify(accounts)
    const samples = this.extractSamples(provider, results)
    this.cache.set(provider, { updatedAt: now, accounts })

    let database: DatabaseSync | null = null
    try {
      database = this.openDatabase()
      const previousCache = database.prepare(
        'SELECT payload FROM usage_cache WHERE provider = ?'
      ).get(provider) as { payload: string } | undefined
      const cacheChanged = previousCache?.payload !== payload
      if (!cacheChanged && samples.length === 0) return

      const upsertCache = database.prepare(`
        INSERT INTO usage_cache (provider, updated_at, payload)
        VALUES (?, ?, ?)
        ON CONFLICT(provider) DO UPDATE SET
          updated_at = excluded.updated_at,
          payload = excluded.payload
      `)
      const latest = database.prepare(`
        SELECT remaining_bps, reset_at
        FROM quota_history
        WHERE provider = ? AND account_id = ? AND period = ? AND series_key = ?
        ORDER BY sample_hour DESC
        LIMIT 1
      `)
      const insert = database.prepare(`
        INSERT OR IGNORE INTO quota_history (
          provider,
          account_id,
          period,
          series_key,
          sample_hour,
          remaining_bps,
          reset_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      // ponytail: hourly samples cap writes; lower the bucket only if higher resolution proves useful.
      const sampleHour = Math.floor(now / HOUR_MS)

      try {
        database.exec('BEGIN')
        if (cacheChanged) upsertCache.run(provider, now, payload)
        for (const sample of samples) {
          const previous = latest.get(
            provider,
            sample.accountId,
            sample.period,
            sample.seriesKey
          ) as { remaining_bps: number; reset_at: number | null } | undefined

          if (
            previous?.remaining_bps === sample.remainingBps &&
            previous.reset_at === sample.resetAt
          ) {
            continue
          }

          insert.run(
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
      } catch (error) {
        if (database.isTransaction) database.exec('ROLLBACK')
        throw error
      }
    } catch (error) {
      console.error(`[Usage History] Failed to record ${provider}:`, error)
    } finally {
      database?.close()
    }
  }

  getQuotaHistory(provider: ProviderId, accountId: string, now = Date.now()): QuotaHistory {
    if (!existsSync(this.databasePath)) return { weekly: [], monthly: [] }

    const database = this.openDatabase()
    try {
      const rows = database.prepare(`
        SELECT period, series_key, sample_hour, remaining_bps, reset_at
        FROM quota_history
        WHERE provider = ? AND account_id = ? AND sample_hour >= ?
        ORDER BY sample_hour
      `).all(provider, accountId, Math.floor((now - 32 * DAY_MS) / HOUR_MS)) as unknown as HistoryRow[]

      return rows.reduce<QuotaHistory>((history, row) => {
        const sampledAt = row.sample_hour * HOUR_MS
        if (row.period === 'weekly' && sampledAt < now - 8 * DAY_MS) return history

        history[row.period].push({
          seriesKey: row.series_key,
          sampledAt,
          remaining: row.remaining_bps / 100,
          resetAt: row.reset_at ?? undefined
        })
        return history
      }, { weekly: [], monthly: [] })
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

  deleteAccount(provider: ProviderId, accountId: string): void {
    if (!existsSync(this.databasePath)) return

    let database: DatabaseSync | null = null
    try {
      this.loadCache()
      const accounts = (this.cache.get(provider)?.accounts ?? [])
        .filter(account => account.accountId !== accountId)
      const updatedAt = Date.now()
      this.cache.set(provider, { updatedAt, accounts })

      database = this.openDatabase()
      database.exec('BEGIN')
      try {
        database.prepare(
          'DELETE FROM quota_history WHERE provider = ? AND account_id = ?'
        ).run(provider, accountId)
        database.prepare(`
          INSERT INTO usage_cache (provider, updated_at, payload)
          VALUES (?, ?, ?)
          ON CONFLICT(provider) DO UPDATE SET
            updated_at = excluded.updated_at,
            payload = excluded.payload
        `).run(provider, updatedAt, JSON.stringify(accounts))
        database.exec('COMMIT')
      } catch (error) {
        if (database.isTransaction) database.exec('ROLLBACK')
        throw error
      }
    } catch (error) {
      console.error(`[Usage Data] Failed to delete ${provider}/${accountId}:`, error)
    } finally {
      database?.close()
    }
  }

  clearMemoryCache(): void {
    this.cache.clear()
    this.cacheLoaded = false
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

  private sanitizeResults(results: unknown[]): CachedAccountUsage[] {
    return results.flatMap(result => {
      if (!result || typeof result !== 'object') return []
      const value = result as {
        accountId?: unknown
        name?: unknown
        usage?: unknown
        error?: unknown
      }
      if (typeof value.accountId !== 'string' || typeof value.name !== 'string') return []

      return [{
        accountId: value.accountId,
        name: value.name,
        usage: value.usage ?? null,
        ...(value.error ? { error: 'Usage unavailable' } : {})
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
