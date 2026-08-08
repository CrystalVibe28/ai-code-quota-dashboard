import type { ZaiLimit } from './types/usage'

export type ZaiQuotaType = 'fiveHour' | 'weekly' | 'tokensLimit' | 'timeLimit'

export function getZaiCardId(accountId: string, limit: ZaiLimit): string {
  return `zaiCoding-${accountId}-${limit.type}-${limit.unit ?? 'none'}-${limit.number ?? 'none'}`
}

export function getZaiQuotaType(limit: Pick<ZaiLimit, 'type' | 'unit'>): ZaiQuotaType | null {
  if (limit.type === 'TIME_LIMIT') return 'timeLimit'
  if (limit.type !== 'TOKENS_LIMIT') return null
  if (limit.unit === 3) return 'fiveHour'
  if (limit.unit === 6) return 'weekly'
  return 'tokensLimit'
}
