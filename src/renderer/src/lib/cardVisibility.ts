import type { CardId, ProviderId } from '@/types/customization'
import { getZaiCardId } from '@shared/zaiQuota'

export function getAccountCardIds(
  providerId: ProviderId,
  accountId: string,
  usage: any,
  hideUnlimitedQuota: boolean
): CardId[] {
  if (!usage) return []

  if (providerId === 'antigravity') {
    return usage.map((model: any) => `antigravity-${accountId}-${model.modelName}`)
  }

  if (providerId === 'githubCopilot') {
    return Object.entries(usage.quotaSnapshots || {})
      .filter(([, quota]: [string, any]) => !quota.unlimited || !hideUnlimitedQuota)
      .map(([key]) => `githubCopilot-${accountId}-${key}`)
  }

  if (providerId === 'zaiCoding') {
    return usage.limits.map((limit: any) => getZaiCardId(accountId, limit))
  }

  if (providerId === 'codex') {
    return [
      ['rateLimit_primary', usage.rate_limit?.primary_window],
      ['rateLimit_secondary', usage.rate_limit?.secondary_window],
      ['codeReview_primary', usage.code_review_rate_limit?.primary_window],
      ['codeReview_secondary', usage.code_review_rate_limit?.secondary_window]
    ].filter(([, window]) => window).map(([suffix]) => `codex-${accountId}-${suffix}`)
  }

  if (providerId === 'aiStudio') {
    return usage.limits.map((limit: any) => `aiStudio-${accountId}-${limit.model}`)
  }

  return (usage.limits || []).map((limit: any) => `${providerId}-${accountId}-${limit.type}`)
}
