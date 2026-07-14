import type { ZaiLimit } from './types/usage'

export type ZaiQuotaType = 'fiveHour' | 'weekly' | 'tokensLimit' | 'timeLimit'

export function getZaiQuotaType(limit: Pick<ZaiLimit, 'type' | 'unit'>): ZaiQuotaType | null {
  if (limit.type === 'TIME_LIMIT') return 'timeLimit'
  if (limit.type !== 'TOKENS_LIMIT') return null
  if (limit.unit === 3) return 'fiveHour'
  if (limit.unit === 6) return 'weekly'
  return 'tokensLimit'
}
