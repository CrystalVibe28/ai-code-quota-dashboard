import { describe, expect, it } from 'vitest'
import { getTrayQuotaItems } from '../trayUsage'

const t = (key: string): string => key

describe('getTrayQuotaItems', () => {
  it('normalizes percentage quotas from every cached provider shape', () => {
    expect(getTrayQuotaItems('antigravity', [{
      modelName: 'Gemini weekly',
      remainingFraction: 0.8
    }], t)[0]).toMatchObject({ percentage: 80 })

    expect(getTrayQuotaItems('githubCopilot', {
      quotaSnapshots: {
        chat: { entitlement: 100, remaining: 70, percent_remaining: 70, unlimited: false }
      }
    }, t)[0]).toMatchObject({ percentage: 70 })

    expect(getTrayQuotaItems('zaiCoding', {
      limits: [{ type: 'TOKENS_LIMIT', unit: 6, percentage: 25 }]
    }, t)[0]).toMatchObject({ percentage: 75 })

    expect(getTrayQuotaItems('codex', {
      rate_limit: {
        primary_window: {
          used_percent: 40,
          limit_window_seconds: 2_592_000,
          reset_after_seconds: 1,
          reset_at: 1
        }
      }
    }, t)[0]).toMatchObject({ percentage: 60 })

    expect(getTrayQuotaItems('opencodeGo', {
      limits: [{ type: 'weeklyUsage', remaining: 65, unlimited: false }]
    }, t)[0]).toMatchObject({ percentage: 65 })

    expect(getTrayQuotaItems('ollamaCloud', {
      limits: [{ type: 'weekly', remaining: 55 }]
    }, t)[0]).toMatchObject({ percentage: 55 })
  })

  it('converts AI Studio limits to remaining percentages without hiding unlimited quotas', () => {
    const items = getTrayQuotaItems('aiStudio', {
      limits: [{
        model: 'gemini',
        rpm: 100,
        tpm: -1,
        rpd: null,
        rpmUsed: 25,
        tpmUsed: 200,
        rpdUsed: 3
      }]
    }, t)

    expect(items[0]).toMatchObject({ percentage: 75, detail: '25 / 100' })
    expect(items[1]).toMatchObject({ percentage: 100, detail: '200 / ∞' })
    expect(items[2]).toMatchObject({ percentage: undefined, detail: '3 / —' })
  })
})
