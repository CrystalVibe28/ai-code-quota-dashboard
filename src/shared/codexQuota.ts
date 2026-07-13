export type CodexQuotaKind = 'rateLimit' | 'codeReview'
export type CodexQuotaPeriod = 'fiveHour' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quota'

export interface CodexQuotaPeriodInfo {
  period: CodexQuotaPeriod
  count?: number
}

const HOUR_SECONDS = 60 * 60
const DAY_SECONDS = 24 * HOUR_SECONDS

export function getCodexQuotaPeriod(limitWindowSeconds?: number | null): CodexQuotaPeriodInfo {
  if (!limitWindowSeconds || !Number.isFinite(limitWindowSeconds)) {
    return { period: 'quota' }
  }

  const hours = limitWindowSeconds / HOUR_SECONDS
  const days = limitWindowSeconds / DAY_SECONDS

  if (Math.abs(hours - 5) < 0.1) {
    return { period: 'fiveHour' }
  }

  if (days >= 27 && days <= 32) {
    return { period: 'monthly' }
  }

  if (days >= 6 && days <= 8) {
    return { period: 'weekly' }
  }

  if (limitWindowSeconds % DAY_SECONDS === 0) {
    return { period: 'daily', count: days }
  }

  if (limitWindowSeconds % HOUR_SECONDS === 0) {
    return { period: 'hourly', count: hours }
  }

  return { period: 'quota' }
}

export function formatCodexQuotaLabel(limitWindowSeconds?: number | null, kind: CodexQuotaKind = 'rateLimit'): string {
  const { period, count } = getCodexQuotaPeriod(limitWindowSeconds)
  const base = (() => {
    switch (period) {
      case 'fiveHour':
        return '5-hour quota'
      case 'hourly':
        return `${count}-hour quota`
      case 'daily':
        return `${count}-day quota`
      case 'weekly':
        return 'Weekly quota'
      case 'monthly':
        return 'Monthly quota'
      default:
        return 'Quota'
    }
  })()

  return kind === 'codeReview' ? `Code review ${base.toLowerCase()}` : base
}
