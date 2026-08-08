// src/shared/types/accounts.ts
// Shared account type definitions used across main, preload, and renderer processes

/**
 * Provider identifiers
 */
export type ProviderId = 'antigravity' | 'githubCopilot' | 'zaiCoding' | 'codex' | 'opencodeGo' | 'ollamaCloud' | 'aiStudio'

/**
 * Base account interface with common fields
 */
export interface BaseAccount {
  id: string
  displayName: string
  showInOverview: boolean
}

/**
 * Antigravity (Google Cloud Code) account
 */
export interface AntigravityAccount extends BaseAccount {
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  projectId: string
  selectedModels: string[]
}

/**
 * GitHub Copilot account
 */
export interface GithubCopilotAccount extends BaseAccount {
  login: string
  email: string
  name: string
  avatarUrl?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  selectedQuotas: string[]
}

/**
 * Zai Coding Plan account
 */
export interface ZaiCodingAccount extends BaseAccount {
  name: string
  apiKey: string
  selectedLimits: string[]
}

export type AiStudioTier = 'free' | 'tier1' | 'tier2' | 'tier3'
export type AiStudioPaidTier = Exclude<AiStudioTier, 'free'>
export type AiStudioTierSource = 'system' | 'manual' | 'default'

export interface AiStudioProject {
  projectId: string
  projectNumber: string
  name: string
}

export interface AiStudioLoginSession {
  userId: string
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  projects: AiStudioProject[]
}

export interface AiStudioAccount extends BaseAccount {
  userId: string
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  projectId: string
  projectNumber: string
  projectName: string
  tier: AiStudioTier
  manualTier?: AiStudioPaidTier
  tierSource?: AiStudioTierSource
}

/**
 * OpenAI Codex account
 */
export interface CodexAccount extends BaseAccount {
  email: string
  planType: string
  accessToken: string
  refreshToken: string
  idToken: string
  expiresAt: number
  accountId: string
  organizationId: string
}

/**
 * Opencode Go account
 */
export interface OpencodeGoAccount extends BaseAccount {
  workspaceId: string
  workspaceName?: string
  email?: string
  cookieHeader: string
  expiresAt: number
}

/**
 * Ollama Cloud account
 */
export interface OllamaCloudAccount extends BaseAccount {
  email: string
  cookieHeader: string
  expiresAt: number
}

/**
 * Union type for all account types
 */
export type Account = AntigravityAccount | GithubCopilotAccount | ZaiCodingAccount | CodexAccount | OpencodeGoAccount | OllamaCloudAccount | AiStudioAccount

/**
 * Partial types for account updates
 */
export type AntigravityAccountUpdate = Partial<Omit<AntigravityAccount, 'id'>>
export type GithubCopilotAccountUpdate = Partial<Omit<GithubCopilotAccount, 'id'>>
export type ZaiCodingAccountUpdate = Partial<Omit<ZaiCodingAccount, 'id'>>
export type CodexAccountUpdate = Partial<Omit<CodexAccount, 'id'>>
export type OpencodeGoAccountUpdate = Partial<Omit<OpencodeGoAccount, 'id'>>
export type OllamaCloudAccountUpdate = Partial<Omit<OllamaCloudAccount, 'id'>>
export type AiStudioAccountUpdate = Partial<Omit<AiStudioAccount, 'id'>>

/**
 * Login result types
 */
export interface LoginResult<T = unknown> {
  success: boolean
  account?: T
  error?: string
}

export type AntigravityLoginResult = LoginResult<AntigravityAccount>
export type GithubCopilotLoginResult = LoginResult<GithubCopilotAccount>
export type CodexLoginResult = LoginResult<CodexAccount>
export type OpencodeGoLoginResult = LoginResult<OpencodeGoAccount>
export type OllamaCloudLoginResult = LoginResult<OllamaCloudAccount>
