// src/shared/types/usage.ts
// Shared usage type definitions for all providers

/**
 * Antigravity model quota
 */
export interface ModelQuota {
  modelName: string
  remainingFraction: number
  resetTime?: string
}

/**
 * Antigravity account usage data
 */
export interface AntigravityUsage {
  accountId: string
  name: string
  usage: ModelQuota[] | null
  error?: string
}

/**
 * GitHub Copilot quota snapshot for a single quota type
 */
export interface QuotaSnapshot {
  entitlement: number
  remaining: number
  percent_remaining: number
  unlimited: boolean
}

/**
 * GitHub Copilot usage data
 */
export interface CopilotUsage {
  accessTypeSku: string
  copilotPlan: string
  quotaResetDate: string
  quotaSnapshots: Record<string, QuotaSnapshot>
}

/**
 * GitHub Copilot account usage data
 */
export interface GithubCopilotAccountUsage {
  accountId: string
  name: string
  login: string
  usage: CopilotUsage | null
  error?: string
}

/**
 * Zai Coding Plan usage detail for a specific model
 */
export interface ZaiUsageDetail {
  modelCode: string
  usage: number
}

/**
 * Zai Coding Plan limit information
 */
export interface ZaiLimit {
  type: string
  usage: number
  currentValue: number
  remaining: number
  percentage: number
  nextResetTime?: number
  usageDetails?: ZaiUsageDetail[]
}

/**
 * Zai Coding Plan usage data
 */
export interface ZaiUsage {
  limits: ZaiLimit[]
}

/**
 * Zai Coding Plan account usage data
 */
export interface ZaiAccountUsage {
  accountId: string
  name: string
  usage: ZaiUsage | null
  error?: string
}
