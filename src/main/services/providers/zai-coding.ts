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
        // Get response text first to handle empty responses
        const responseText = await response.text()
        if (!responseText || responseText.trim() === '') {
          return { valid: false, error: 'Empty response from server' }
        }

        let data: { success: boolean; msg?: string }
        try {
          data = JSON.parse(responseText)
        } catch {
          return { valid: false, error: 'Invalid JSON response from server' }
        }

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

      // Get response text first to handle empty responses
      const responseText = await response.text()
      if (!responseText || responseText.trim() === '') {
        console.warn('[Zai Coding Plan] Empty response body received')
        return null
      }

      let data: { success: boolean; data?: { limits?: Limit[] }; msg?: string }
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('[Zai Coding Plan] Failed to parse response JSON:', parseError)
        return null
      }

      if (!data.success) {
        return null
      }

      return {
        limits: data.data?.limits || []
      }
    } catch (error) {
      console.error('[Zai Coding Plan] Failed to fetch usage:', error)
      return null
    }
  }
}
