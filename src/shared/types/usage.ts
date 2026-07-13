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

/**
 * Codex rate limit window. The period is determined by limit_window_seconds.
 */
export interface CodexRateWindow {
  used_percent: number
  limit_window_seconds: number
  reset_after_seconds: number
  reset_at: number
}

export interface CodexRateLimit {
  allowed: boolean
  limit_reached: boolean
  primary_window: CodexRateWindow | null
  secondary_window: CodexRateWindow | null
}

export interface CodexUsageData {
  plan_type: string
  rate_limit: CodexRateLimit | null
  code_review_rate_limit: CodexRateLimit | null
}

export interface CodexAccountUsage {
  accountId: string
  name: string
  email: string
  usage: CodexUsageData | null
  error?: string
}

export interface OpencodeGoLimit {
  type: string
  used: number
  limit: number
  remaining: number
  percentage: number
  resetTime?: string | number
  unit?: string
  unlimited?: boolean
}

export interface OpencodeGoUsage {
  workspaceId: string
  workspaceName?: string
  limits: OpencodeGoLimit[]
}

export interface OpencodeGoAccountUsage {
  accountId: string
  name: string
  workspaceId: string
  usage: OpencodeGoUsage | null
  error?: string
}
