import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { DatabaseSync } from 'node:sqlite'

vi.mock('electron', () => ({ app: { getPath: vi.fn(() => '') } }))

import { UsageDataService } from '../usage-data'

describe('UsageDataService', () => {
  let directory: string
  let service: UsageDataService
  let now: number

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'quota-history-'))
    service = new UsageDataService(join(directory, 'usage-history.db'))
    now = Math.floor(Date.now() / 3600000) * 3600000
  })

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true })
  })

  it('records only weekly and monthly quota types for supported providers', () => {
    service.recordProvider('antigravity', [{
      accountId: 'anti',
      name: 'Anti',
      usage: [
        { modelName: 'Gemini weekly', remainingFraction: 0.8 },
        { modelName: 'Gemini 5-hour', remainingFraction: 0.5 }
      ]
    }], now)
    service.recordProvider('zaiCoding', [{
      accountId: 'zai',
      name: 'Zai',
      usage: {
        limits: [
          { type: 'TOKENS_LIMIT', unit: 6, number: 1, percentage: 25 },
          { type: 'TOKENS_LIMIT', unit: 3, number: 5, percentage: 50 }
        ]
      }
    }], now)
    service.recordProvider('codex', [{
      accountId: 'codex',
      name: 'Codex',
      email: 'codex@example.com',
      usage: {
        plan_type: 'pro',
        rate_limit: {
          allowed: true,
          limit_reached: false,
          primary_window: {
            used_percent: 20,
            limit_window_seconds: 7 * 24 * 60 * 60,
            reset_after_seconds: 10,
            reset_at: now / 1000
          },
          secondary_window: {
            used_percent: 30,
            limit_window_seconds: 30 * 24 * 60 * 60,
            reset_after_seconds: 10,
            reset_at: now / 1000
          }
        },
        code_review_rate_limit: null
      }
    }], now)
    service.recordProvider('opencodeGo', [{
      accountId: 'opencode',
      name: 'OpenCode',
      workspaceId: 'workspace',
      usage: {
        workspaceId: 'workspace',
        limits: [
          { type: 'weeklyUsage', used: 10, limit: 100, remaining: 90, percentage: 10 },
          { type: 'monthlyUsage', used: 20, limit: 100, remaining: 80, percentage: 20 },
          { type: 'rollingUsage', used: 30, limit: 100, remaining: 70, percentage: 30 }
        ]
      }
    }], now)
    service.recordProvider('ollamaCloud', [{
      accountId: 'ollama',
      name: 'Ollama',
      email: 'ollama@example.com',
      usage: {
        limits: [
          { type: 'weekly', used: 35, limit: 100, remaining: 65, percentage: 35, unit: 'percent', unlimited: false },
          { type: 'session', used: 45, limit: 100, remaining: 55, percentage: 45, unit: 'percent', unlimited: false }
        ]
      }
    }], now)

    expect(service.getQuotaHistory('antigravity', 'anti', now).weekly).toHaveLength(1)
    expect(service.getQuotaHistory('zaiCoding', 'zai', now).weekly).toHaveLength(1)
    expect(service.getQuotaHistory('codex', 'codex', now)).toMatchObject({
      weekly: [{ remaining: 80 }],
      monthly: [{ remaining: 70 }]
    })
    expect(service.getQuotaHistory('opencodeGo', 'opencode', now)).toMatchObject({
      weekly: [{ remaining: 90 }],
      monthly: [{ remaining: 80 }]
    })
    expect(service.getQuotaHistory('ollamaCloud', 'ollama', now).weekly).toMatchObject([
      { remaining: 65 }
    ])
  })

  it('stores one sample per hour and keeps the last value within that hour', () => {
    const usage = (remainingFraction: number) => [{
      accountId: 'anti',
      name: 'Anti',
      usage: [{
        modelName: 'Gemini weekly',
        remainingFraction,
        resetTime: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
      }]
    }]

    service.recordProvider('antigravity', usage(0.8), now)
    service.recordProvider('antigravity', usage(0.7), now + 1000)
    service.recordProvider('antigravity', usage(0.7), now + 3600000)
    service.recordProvider('antigravity', usage(0.6), now + 3601000)
    service.recordProvider('antigravity', usage(0.6), now + 7200000)

    expect(service.getQuotaHistory('antigravity', 'anti', now + 7200000).weekly)
      .toMatchObject([{ remaining: 70 }, { remaining: 60 }, { remaining: 60 }])
  })

  it('audits provider and account attempts without persisting error details', () => {
    const success = {
      accountId: 'success',
      name: 'Success',
      usage: [{ modelName: 'Gemini weekly', remainingFraction: 0.8 }]
    }
    const failure = {
      accountId: 'failure',
      name: 'Failure',
      usage: null,
      error: 'private upstream response'
    }

    service.recordProvider('antigravity', [success, failure], now)
    service.recordProvider('antigravity', [success], now + 1000)
    service.recordProviderFailure('antigravity', now + 2000)
    service.recordProvider('antigravity', [success], now + 3600000)

    const successHistory = service.getQuotaHistory('antigravity', 'success', now + 3600000)
    expect(successHistory.audit.provider).toMatchObject([
      { attempts: 3, successes: 1, failures: 2, lastSuccess: false },
      { attempts: 1, successes: 1, failures: 0, lastSuccess: true }
    ])
    expect(successHistory.audit.account).toMatchObject([
      { attempts: 2, successes: 2, failures: 0, lastSuccess: true },
      { attempts: 1, successes: 1, failures: 0, lastSuccess: true }
    ])
    expect(service.getQuotaHistory('antigravity', 'failure', now).audit.account)
      .toMatchObject([{ attempts: 1, successes: 0, failures: 1, lastSuccess: false }])
    expect(JSON.stringify(successHistory.audit)).not.toContain('private upstream response')
  })

  it('audits a successful provider response even when it has no history series', () => {
    service.recordProvider('githubCopilot', [{
      accountId: 'copilot',
      name: 'Copilot',
      usage: { quotaSnapshots: {} }
    }], now)

    expect(service.getQuotaHistory('githubCopilot', 'copilot', now)).toMatchObject({
      weekly: [],
      monthly: [],
      audit: {
        provider: [{ lastSuccess: true }],
        account: [{ lastSuccess: true }]
      }
    })
  })

  it('deletes an account history without affecting another account', () => {
    const result = (accountId: string) => [{
      accountId,
      name: accountId,
      usage: [{ modelName: 'Gemini weekly', remainingFraction: 0.8 }]
    }]
    service.recordProvider('antigravity', result('first'), now)
    service.recordProvider('antigravity', result('second'), now)

    service.deleteAccount('antigravity', 'first')

    expect(service.getQuotaHistory('antigravity', 'first', now).weekly).toEqual([])
    expect(service.getQuotaHistory('antigravity', 'first', now).audit.account).toEqual([])
    expect(service.getQuotaHistory('antigravity', 'second', now).weekly).toHaveLength(1)
    expect(service.getQuotaHistory('antigravity', 'second', now).audit.account).toHaveLength(1)
  })

  it('does not let an in-flight refresh recreate a deleted account', () => {
    const result = [{
      accountId: 'deleted',
      name: 'Deleted',
      usage: [{ modelName: 'Gemini weekly', remainingFraction: 0.8 }]
    }]
    const startedAt = Date.now() - 1000
    service.recordProvider('antigravity', result, now, startedAt)

    expect(service.deleteAccount('antigravity', 'deleted')).toBe(true)
    expect(service.recordProvider('antigravity', result, now + 1000, startedAt)).toEqual([])
    expect(service.getQuotaHistory('antigravity', 'deleted', now + 1000)).toMatchObject({
      weekly: [],
      audit: { account: [] }
    })
  })

  it('ignores refreshes that started before all data was invalidated', () => {
    const result = [{
      accountId: 'old',
      name: 'Old',
      usage: [{ modelName: 'Gemini weekly', remainingFraction: 0.8 }]
    }]
    const startedAt = Date.now() - 1000

    service.invalidateAll()

    expect(service.recordProvider('antigravity', result, now, startedAt)).toEqual([])
    service.recordProviderFailure('antigravity', now, startedAt)
    expect(service.getCachedUsage().providers.antigravity).toEqual([])
    expect(existsSync(join(directory, 'usage-history.db'))).toBe(false)
  })

  it('propagates a SQLite write failure instead of publishing an unpersisted result', () => {
    const broken = new UsageDataService(directory)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => broken.recordProvider('antigravity', [{
      accountId: 'account',
      name: 'Account',
      usage: [{ modelName: 'Gemini weekly', remainingFraction: 0.8 }]
    }], now)).toThrow()
    expect(broken.getCachedUsage().providers.antigravity).toEqual([])

    consoleError.mockRestore()
  })

  it('persists a credential-free local cache and skips identical rewrites', () => {
    const result = [{
      accountId: 'codex',
      name: 'Codex Account',
      email: 'private@example.com',
      usage: null,
      error: 'response included private details'
    }]
    service.recordProvider('codex', result, now)
    service.recordProvider('codex', result, now + 3600000)

    expect(service.getCachedUsage()).toMatchObject({
      updatedAt: now + 3600000,
      providers: {
        codex: [{
          accountId: 'codex',
          name: 'Codex Account',
          usage: null,
          error: 'Usage unavailable'
        }]
      }
    })
    expect(JSON.stringify(service.getCachedUsage())).not.toContain('private@example.com')
    expect(new UsageDataService(join(directory, 'usage-history.db')).getCachedUsage().updatedAt)
      .toBe(now)
  })

  it('adds sync auditing to an existing history database without changing old rows', () => {
    const databasePath = join(directory, 'legacy.db')
    const database = new DatabaseSync(databasePath)
    database.exec(`
      CREATE TABLE quota_history (
        provider TEXT NOT NULL,
        account_id TEXT NOT NULL,
        period TEXT NOT NULL,
        series_key TEXT NOT NULL,
        sample_hour INTEGER NOT NULL,
        remaining_bps INTEGER NOT NULL,
        reset_at INTEGER,
        PRIMARY KEY (provider, account_id, period, series_key, sample_hour)
      ) WITHOUT ROWID;
      CREATE TABLE usage_cache (
        provider TEXT PRIMARY KEY,
        updated_at INTEGER NOT NULL,
        payload TEXT NOT NULL
      ) WITHOUT ROWID;
    `)
    database.prepare(`
      INSERT INTO quota_history VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('antigravity', 'legacy', 'weekly', 'geminiWeekly', now / 3600000, 8000, null)
    database.close()

    const migrated = new UsageDataService(databasePath)
    migrated.recordProvider('antigravity', [{
      accountId: 'legacy',
      name: 'Legacy',
      usage: [{ modelName: 'Gemini weekly', remainingFraction: 0.8 }]
    }], now + 3600000)

    expect(migrated.getQuotaHistory('antigravity', 'legacy', now + 3600000)).toMatchObject({
      weekly: [{ remaining: 80 }, { remaining: 80 }],
      audit: { account: [{ lastSuccess: true }] }
    })
  })
})
