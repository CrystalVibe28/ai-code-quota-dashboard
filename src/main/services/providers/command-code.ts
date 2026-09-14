import type {
  CommandCodeCredits,
  CommandCodeLimit,
  CommandCodeUsage
} from '@shared/types'
import { fetchWithTimeout } from './fetchWithTimeout'

const API_URL = 'https://api.commandcode.ai/alpha'
// ponytail: Command Code exposes monthly caps client-side; unknown plans omit the monthly card.
const MONTHLY_CREDITS_BY_PLAN: Record<string, number> = {
  'individual-provider': 15,
  'individual-go': 10,
  'individual-goat': 70,
  'individual-pro': 30,
  'individual-pro-v1': 80,
  'individual-max': 150,
  'individual-ultra': 300,
  'teams-pro': 40
}

interface CommandCodeWindow {
  used: number
  cap: number
  resetAt?: number
}

interface CommandCodeCreditsResponse {
  credits: {
    monthlyCredits?: number
    purchasedCredits?: number
    freeCredits?: number
    planId?: string | null
  }
  windowLimits: {
    fiveHour?: CommandCodeWindow
    weekly?: CommandCodeWindow
  }
}

interface CommandCodeSubscription {
  planId?: string
  status?: string
  currentPeriodEnd?: string | number
}

export class CommandCodeService {
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    if (!apiKey.trim()) return { valid: false, error: 'Invalid API key' }

    try {
      const response = await this.request('whoami', apiKey)
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' }
      }
      if (!response.ok) {
        return { valid: false, error: `API error: ${response.status}` }
      }

      const data = await this.parseJson(response, 'Identity response') as {
        success?: unknown
        user?: unknown
      }
      return data.success === true && Boolean(data.user)
        ? { valid: true }
        : { valid: false, error: 'Invalid identity response' }
    } catch (error) {
      return { valid: false, error: String(error) }
    }
  }

  async fetchUsage(apiKey: string): Promise<CommandCodeUsage> {
    if (!apiKey.trim()) throw new Error('Invalid Command Code API key')

    const [response, identityResponse] = await Promise.all([
      this.request('billing/credits', apiKey),
      this.request('whoami', apiKey)
    ])
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Command Code API key')
    }
    if (!response.ok) {
      throw new Error(`Command Code usage request failed: HTTP ${response.status}`)
    }

    const data = await this.parseJson(response, 'Usage response')
    if (!isCreditsResponse(data)) {
      throw new Error('Usage response included invalid credits or limits')
    }

    const identity = identityResponse.ok
      ? await this.parseJson(identityResponse, 'Identity response').catch(() => null)
      : null
    const orgId = getNestedString(identity, 'org', 'id')
    const subscription = await this.fetchSubscription(apiKey, orgId)
    const planId = subscription?.planId ?? (
      typeof data.credits.planId === 'string' ? data.credits.planId : undefined
    )

    return {
      limits: this.toLimits(data, { ...subscription, planId }),
      credits: this.toCredits(data.credits, planId)
    }
  }

  private async fetchSubscription(
    apiKey: string,
    orgId?: string
  ): Promise<CommandCodeSubscription | null> {
    const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''
    try {
      const response = await this.request(`billing/subscriptions${query}`, apiKey)
      if (!response.ok) return null

      const value = await this.parseJson(response, 'Subscription response')
      if (!value || typeof value !== 'object') return null
      const data = (value as Record<string, unknown>).data
      if (!data || typeof data !== 'object') return null
      const subscription = data as Record<string, unknown>
      return {
        ...(typeof subscription.planId === 'string' ? { planId: subscription.planId } : {}),
        ...(typeof subscription.status === 'string' ? { status: subscription.status } : {}),
        ...(isResetTime(subscription.currentPeriodEnd)
          ? { currentPeriodEnd: subscription.currentPeriodEnd }
          : {})
      }
    } catch {
      return null
    }
  }

  private request(path: string, apiKey: string): Promise<Response> {
    return fetchWithTimeout(`${API_URL}/${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    })
  }

  private async parseJson(response: Response, label: string): Promise<unknown> {
    const text = await response.text()
    if (!text.trim()) throw new Error(`${label} was empty`)

    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`${label} was not valid JSON`)
    }
  }

  private toCredits(
    value: CommandCodeCreditsResponse['credits'],
    planId?: string
  ): CommandCodeCredits {
    return {
      monthlyRemaining: value.monthlyCredits ?? 0,
      purchased: value.purchasedCredits ?? 0,
      free: value.freeCredits ?? 0,
      ...(planId ? { planId } : {})
    }
  }

  private toLimits(
    value: CommandCodeCreditsResponse,
    subscription: CommandCodeSubscription
  ): CommandCodeLimit[] {
    const limits: CommandCodeLimit[] = (['fiveHour', 'weekly'] as const).flatMap(type => {
      const window = value.windowLimits[type]
      if (!window || window.cap <= 0) return []

      const used = Math.min(Math.max(window.used, 0), window.cap)
      const percentage = Math.min((used / window.cap) * 100, 100)
      return [{
        type,
        used,
        limit: window.cap,
        remaining: Math.max(window.cap - used, 0),
        percentage,
        ...(window.resetAt ? { resetTime: window.resetAt } : {}),
        unit: 'usd' as const,
        unlimited: false as const
      }]
    })

    const monthlyCap = subscription.planId
      ? MONTHLY_CREDITS_BY_PLAN[subscription.planId]
      : undefined
    const monthlyRemaining = value.credits.monthlyCredits
    if (monthlyCap && monthlyRemaining !== undefined && subscription.status !== 'past_due') {
      const remaining = Math.min(Math.max(monthlyRemaining, 0), monthlyCap)
      const used = Math.max(0, Math.min(monthlyCap, monthlyCap - monthlyRemaining))
      limits.push({
        type: 'monthly',
        used,
        limit: monthlyCap,
        remaining,
        percentage: Math.min(Math.round((used / monthlyCap) * 100), 100),
        ...(subscription.currentPeriodEnd
          ? { resetTime: subscription.currentPeriodEnd }
          : {}),
        unit: 'usd',
        unlimited: false
      })
    }

    return limits
  }
}

function isCreditsResponse(value: unknown): value is CommandCodeCreditsResponse {
  if (!value || typeof value !== 'object') return false
  const response = value as Record<string, unknown>
  if (!response.credits || typeof response.credits !== 'object') return false
  if (!response.windowLimits || typeof response.windowLimits !== 'object') return false

  const credits = response.credits as Record<string, unknown>
  if (!['monthlyCredits', 'purchasedCredits', 'freeCredits'].every(key => (
    credits[key] === undefined || isFiniteNumber(credits[key])
  ))) return false
  if (credits.planId !== undefined && credits.planId !== null && typeof credits.planId !== 'string') return false

  const windows = response.windowLimits as Record<string, unknown>
  return ['fiveHour', 'weekly'].every(key => (
    windows[key] === undefined || isWindow(windows[key])
  ))
}

function isWindow(value: unknown): value is CommandCodeWindow {
  if (!value || typeof value !== 'object') return false
  const window = value as Record<string, unknown>
  return isFiniteNumber(window.used) &&
    isFiniteNumber(window.cap) &&
    (window.resetAt === undefined || isFiniteNumber(window.resetAt))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isResetTime(value: unknown): value is string | number {
  return (typeof value === 'string' && Number.isFinite(Date.parse(value))) || isFiniteNumber(value)
}

function getNestedString(value: unknown, parent: string, key: string): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  const nested = (value as Record<string, unknown>)[parent]
  if (!nested || typeof nested !== 'object') return undefined
  const result = (nested as Record<string, unknown>)[key]
  return typeof result === 'string' && result ? result : undefined
}
