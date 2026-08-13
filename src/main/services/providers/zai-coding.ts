import { fetchWithTimeout } from './fetchWithTimeout'
import type { ZaiLimit, ZaiUsage } from '@shared/types'

const API_URL = 'https://api.z.ai/api/monitor/usage/quota/limit'

export class ZaiCodingService {
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetchWithTimeout(API_URL, {
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

  async fetchUsage(apiKey: string): Promise<ZaiUsage> {
    const response = await fetchWithTimeout(API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept-Language': 'en-US,en',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Usage request failed: HTTP ${response.status}`)
    }

    const responseText = await response.text()
    if (!responseText.trim()) throw new Error('Usage response was empty')

    let data: { success?: unknown; data?: { limits?: unknown } }
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error('Usage response was not valid JSON')
    }

    if (data.success !== true) throw new Error('Usage API rejected the request')
    if (!Array.isArray(data.data?.limits)) throw new Error('Usage response did not include limits')
    if (!data.data.limits.every(isValidLimit)) throw new Error('Usage response included an invalid limit')

    return { limits: data.data.limits as ZaiLimit[] }
  }
}

function isValidLimit(value: unknown): value is ZaiLimit {
  if (!value || typeof value !== 'object') return false
  const limit = value as Record<string, unknown>
  if (typeof limit.type !== 'string' || !limit.type.trim()) return false
  if (typeof limit.percentage !== 'number' || !Number.isFinite(limit.percentage)) return false

  return ['unit', 'number', 'usage', 'currentValue', 'remaining', 'nextResetTime']
    .every(key => limit[key] === undefined
      || (typeof limit[key] === 'number' && Number.isFinite(limit[key])))
}
