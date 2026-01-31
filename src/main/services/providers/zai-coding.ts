const API_URL = 'https://api.z.ai/api/monitor/usage/quota/limit'

interface UsageDetail {
  modelCode: string
  usage: number
}

interface Limit {
  type: string
  usage: number
  currentValue: number
  remaining: number
  percentage: number
  nextResetTime?: number
  usageDetails?: UsageDetail[]
}

interface ZaiUsage {
  limits: Limit[]
}

export class ZaiCodingService {
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept-Language': 'en-US,en',
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          return { valid: true }
        }
        return { valid: false, error: data.msg || 'Unknown error' }
      }

      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' }
      }

      return { valid: false, error: `API error: ${response.status}` }
    } catch (error) {
      return { valid: false, error: String(error) }
    }
  }

  async fetchUsage(apiKey: string): Promise<ZaiUsage | null> {
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept-Language': 'en-US,en',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      
      if (!data.success) {
        return null
      }

      return {
        limits: data.data?.limits || []
      }
    } catch (error) {
      console.error('[Z.ai Coding] Failed to fetch usage:', error)
      return null
    }
  }
}
