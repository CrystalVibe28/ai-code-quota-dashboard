import { describe, expect, it } from 'vitest'
import { formatCodexQuotaLabel, getCodexQuotaPeriod } from '../codexQuota'

describe('codex quota labels', () => {
  it('maps known Codex window durations to quota periods', () => {
    expect(getCodexQuotaPeriod(5 * 60 * 60)).toEqual({ period: 'fiveHour' })
    expect(getCodexQuotaPeriod(7 * 24 * 60 * 60)).toEqual({ period: 'weekly' })
    expect(getCodexQuotaPeriod(30 * 24 * 60 * 60)).toEqual({ period: 'monthly' })
  })

  it('formats notification labels without primary or secondary wording', () => {
    expect(formatCodexQuotaLabel(5 * 60 * 60)).toBe('5-hour quota')
    expect(formatCodexQuotaLabel(7 * 24 * 60 * 60, 'codeReview')).toBe('Code review weekly quota')
  })
})
