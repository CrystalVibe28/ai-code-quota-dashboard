import { getCodexQuotaPeriod, type CodexQuotaKind } from '@shared/codexQuota'
import type { CodexRateWindow } from '@shared/types'

type Translate = (key: string, options?: Record<string, number | string>) => string

const periodKeys = {
  fiveHour: 'codex.quotaTypes.fiveHour',
  hourly: 'codex.quotaTypes.hourly',
  daily: 'codex.quotaTypes.daily',
  weekly: 'codex.quotaTypes.weekly',
  monthly: 'codex.quotaTypes.monthly',
  quota: 'codex.quotaTypes.quota'
}

export function getCodexWindowLabel(window: CodexRateWindow | null | undefined, kind: CodexQuotaKind, t: Translate): string {
  const { period, count } = getCodexQuotaPeriod(window?.limit_window_seconds)
  const label = t(periodKeys[period], count === undefined ? undefined : { count })

  return kind === 'codeReview'
    ? t('codex.quotaTypes.codeReviewWithQuota', { quota: label })
    : label
}
