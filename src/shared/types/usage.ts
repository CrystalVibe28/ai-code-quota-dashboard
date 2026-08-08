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
  email?: string
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
  unit?: number
  number?: number
  usage?: number
  currentValue?: number
  remaining?: number
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

export interface AiStudioModelLimit {
  model: string
  displayName?: string
  rpm: number | null
  tpm: number | null
  rpd: number | null
  rpmUsed: number
  tpmUsed: number
  rpdUsed: number
}

export interface AiStudioUsage {
  projectId: string
  projectNumber: string
  tier: import('./accounts').AiStudioTier
  tierSource: import('./accounts').AiStudioTierSource
  limits: AiStudioModelLimit[]
}

export interface AiStudioAccountUsage {
  accountId: string
  name: string
  usage: AiStudioUsage | null
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

export interface OllamaCloudLimit {
  type: 'session' | 'weekly'
  used: number
  limit: number
  remaining: number
  percentage: number
  resetTime?: string
  unit: 'percent'
  unlimited: false
}

export interface OllamaCloudUsage {
  plan?: string
  limits: OllamaCloudLimit[]
}

export interface OllamaCloudAccountUsage {
  accountId: string
  name: string
  email: string
  usage: OllamaCloudUsage | null
  error?: string
}

export interface UsageSnapshot {
  updatedAt: number
  antigravity: AntigravityUsage[]
  githubCopilot: GithubCopilotAccountUsage[]
  zaiCoding: ZaiAccountUsage[]
  codex: CodexAccountUsage[]
  opencodeGo: OpencodeGoAccountUsage[]
  ollamaCloud: OllamaCloudAccountUsage[]
  aiStudio: AiStudioAccountUsage[]
}

export type QuotaHistoryPeriod = 'weekly' | 'monthly'

export interface QuotaHistoryPoint {
  seriesKey: string
  sampledAt: number
  remaining: number
  resetAt?: number
}

export interface QuotaHistory {
  weekly: QuotaHistoryPoint[]
  monthly: QuotaHistoryPoint[]
}

export interface CachedAccountUsage {
  accountId: string
  name: string
  usage: unknown
  error?: string
}

export interface LocalUsageCache {
  updatedAt: number | null
  providers: Record<import('./accounts').ProviderId, CachedAccountUsage[]>
}

export interface UsageApiResponse extends LocalUsageCache {
  version: 1
  source: 'local-cache'
}
