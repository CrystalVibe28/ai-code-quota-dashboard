import { describe, expect, it } from 'vitest'
import { getAntigravityQuotaType } from '../antigravityQuota'

describe('Antigravity quota labels', () => {
  it('maps shared quota labels to translation types', () => {
    expect(getAntigravityQuotaType('Gemini 5-hour')).toBe('geminiFiveHour')
    expect(getAntigravityQuotaType('Gemini weekly')).toBe('geminiWeekly')
    expect(getAntigravityQuotaType('Claude/GPT 5-hour')).toBe('claudeGptFiveHour')
    expect(getAntigravityQuotaType('Claude/GPT weekly')).toBe('claudeGptWeekly')
    expect(getAntigravityQuotaType('Unknown')).toBeNull()
  })
})
