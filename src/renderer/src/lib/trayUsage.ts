import type {
  AiStudioUsage,
  AntigravityUsage,
  CodexRateWindow,
  CodexUsageData,
  CopilotUsage,
  OllamaCloudUsage,
  OpencodeGoUsage,
  ProviderId,
  ZaiUsage
} from '@shared/types'
import { getAntigravityQuotaType } from '@shared/antigravityQuota'
import { getZaiQuotaType } from '@shared/zaiQuota'
import { getCodexWindowLabel } from '@/lib/codexQuota'

type Translate = (key: string, options?: Record<string, number | string>) => string

export interface TrayQuotaItem {
  id: string
  label: string
  percentage?: number
  detail?: string
  resetTime?: string | number
}

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export function getTrayQuotaItems(
  providerId: ProviderId,
  usage: unknown,
  t: Translate
): TrayQuotaItem[] {
  if (!usage) return []

  switch (providerId) {
    case 'antigravity':
      return (usage as AntigravityUsage['usage'] ?? []).map(quota => {
        const quotaType = getAntigravityQuotaType(quota.modelName)
        return {
          id: quota.modelName,
          label: quotaType ? t(`antigravity.quotaTypes.${quotaType}`) : quota.modelName,
          percentage: clampPercentage(quota.remainingFraction * 100),
          resetTime: quota.resetTime
        }
      })

    case 'githubCopilot': {
      const copilot = usage as CopilotUsage
      const labels: Record<string, string> = {
        chat: t('trayPopover.copilot.chat'),
        completions: t('trayPopover.copilot.completions'),
        premium_interactions: t('trayPopover.copilot.premiumInteractions')
      }
      return Object.entries(copilot.quotaSnapshots ?? {}).map(([key, quota]) => ({
        id: key,
        label: labels[key] ?? key.replace(/_/g, ' '),
        percentage: clampPercentage(quota.unlimited ? 100 : quota.percent_remaining),
        detail: quota.unlimited ? '∞' : undefined,
        resetTime: copilot.quotaResetDate
      }))
    }

    case 'zaiCoding':
      return ((usage as ZaiUsage).limits ?? []).map((limit, index) => {
        const quotaType = getZaiQuotaType(limit)
        return {
          id: `${limit.type}-${limit.unit ?? index}`,
          label: quotaType ? t(`zaiCoding.limits.${quotaType}`) : limit.type,
          percentage: clampPercentage(100 - limit.percentage),
          resetTime: limit.nextResetTime
        }
      })

    case 'codex': {
      const codex = usage as CodexUsageData
      const windows: Array<{
        id: string
        kind: 'rateLimit' | 'codeReview'
        value: CodexRateWindow | null | undefined
      }> = [
        { id: 'rate-primary', kind: 'rateLimit', value: codex.rate_limit?.primary_window },
        { id: 'rate-secondary', kind: 'rateLimit', value: codex.rate_limit?.secondary_window },
        { id: 'review-primary', kind: 'codeReview', value: codex.code_review_rate_limit?.primary_window },
        { id: 'review-secondary', kind: 'codeReview', value: codex.code_review_rate_limit?.secondary_window }
      ]
      return windows.flatMap(entry => entry.value ? [{
        id: entry.id,
        label: getCodexWindowLabel(entry.value, entry.kind, t),
        percentage: clampPercentage(100 - entry.value.used_percent),
        resetTime: entry.value.reset_at ? entry.value.reset_at * 1000 : undefined
      }] : [])
    }

    case 'opencodeGo':
      return ((usage as OpencodeGoUsage).limits ?? []).map(limit => ({
        id: limit.type,
        label: t(`opencodeGo.quotaTypes.${limit.type.replace(/Usage$/, '')}`),
        percentage: clampPercentage(limit.unlimited ? 100 : limit.remaining),
        detail: limit.unlimited ? '∞' : undefined,
        resetTime: limit.resetTime
      }))

    case 'ollamaCloud':
      return ((usage as OllamaCloudUsage).limits ?? []).map(limit => ({
        id: limit.type,
        label: t(`ollamaCloud.quotaTypes.${limit.type}`),
        percentage: clampPercentage(limit.remaining),
        resetTime: limit.resetTime
      }))

    case 'aiStudio':
      return ((usage as AiStudioUsage).limits ?? []).flatMap(limit => {
        const title = limit.displayName || limit.model
        return ([
          ['rpm', limit.rpmUsed, limit.rpm],
          ['tpm', limit.tpmUsed, limit.tpm],
          ['rpd', limit.rpdUsed, limit.rpd]
        ] as const).map(([metric, used, quota]) => ({
          id: `${limit.model}-${metric}`,
          label: `${title} · ${t(`aiStudio.${metric}`)}`,
          percentage: quota === -1
            ? 100
            : quota && quota > 0
              ? clampPercentage(100 - (used / quota) * 100)
              : undefined,
          detail: `${used.toLocaleString()} / ${quota === -1 ? '∞' : quota?.toLocaleString() ?? '—'}`
        }))
      })
  }
}
