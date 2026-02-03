// src/shared/types/accounts.ts
// Shared account type definitions used across main, preload, and renderer processes

/**
 * Provider identifiers
 */
export type ProviderId = 'antigravity' | 'githubCopilot' | 'zaiCoding'

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

/**
 * Union type for all account types
 */
export type Account = AntigravityAccount | GithubCopilotAccount | ZaiCodingAccount

/**
 * Partial types for account updates
 */
export type AntigravityAccountUpdate = Partial<Omit<AntigravityAccount, 'id'>>
export type GithubCopilotAccountUpdate = Partial<Omit<GithubCopilotAccount, 'id'>>
export type ZaiCodingAccountUpdate = Partial<Omit<ZaiCodingAccount, 'id'>>

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
