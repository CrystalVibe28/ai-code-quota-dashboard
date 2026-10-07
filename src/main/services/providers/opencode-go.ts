import type { OpencodeGoAccount, OpencodeGoUsage } from '@shared/types'
import { fetchWithTimeout } from './fetchWithTimeout'

const USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'

export class OpencodeGoService {
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.fetchUsage({ apiKey })
      return { valid: true }
    } catch (error) {
      return { valid: false, error: String(error) }
    }
  }

  async fetchUsage(account: Pick<OpencodeGoAccount, 'apiKey' | 'workspaceId' | 'workspaceName'>): Promise<OpencodeGoUsage> {
    const apiKey = account.apiKey?.trim()
    if (!apiKey) throw new Error('Opencode Go API key required')

    const response = await fetchWithTimeout(USAGE_URL, {
      redirect: 'error',
      headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` }
    })
    if (response.status === 401) throw new Error('Opencode Go API key invalid (401)')
    if (response.status === 403) throw new Error('Opencode Go subscription required (403)')
    if (!response.ok) throw new Error(`Failed to fetch Opencode Go usage: ${response.status}`)

    const data = await response.json()
    const periods = ['rolling', 'weekly', 'monthly'] as const
    const limits = periods.map(period => {
      const bucket = data?.usage?.[period]
      if (!bucket || typeof bucket.percent !== 'number' || !Number.isFinite(bucket.percent) ||
          !['ok', 'rate-limited'].includes(bucket.status) ||
          typeof bucket.resetsAt !== 'string' || !Number.isFinite(Date.parse(bucket.resetsAt))) {
        throw new Error('Invalid Opencode Go usage response')
      }
      const used = Math.min(Math.max(bucket.percent, 0), 100)
      return {
        type: `${period}Usage`,
        used,
        limit: 100,
        remaining: 100 - used,
        percentage: used,
        resetTime: Date.parse(bucket.resetsAt),
        unit: 'percent',
        unlimited: false
      }
    })

    return { workspaceId: account.workspaceId, workspaceName: account.workspaceName, limits }
  }
}
