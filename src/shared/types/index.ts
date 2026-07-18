// src/shared/types/index.ts
// Central export file for all shared types

// Account types
export type {
  ProviderId,
  BaseAccount,
  AntigravityAccount,
  GithubCopilotAccount,
  ZaiCodingAccount,
  AiStudioAccount,
  AiStudioProject,
  AiStudioLoginSession,
  AiStudioTier,
  AiStudioPaidTier,
  AiStudioTierSource,
  CodexAccount,
  OpencodeGoAccount,
  Account,
  AntigravityAccountUpdate,
  GithubCopilotAccountUpdate,
  ZaiCodingAccountUpdate,
  CodexAccountUpdate,
  OpencodeGoAccountUpdate,
  AiStudioAccountUpdate,
  LoginResult,
  AntigravityLoginResult,
  GithubCopilotLoginResult,
  CodexLoginResult,
  OpencodeGoLoginResult
} from './accounts'

// Provider adapter interface
export type { ProviderAdapter } from './provider'

// Usage types
export type {
  ModelQuota,
  AntigravityUsage,
  QuotaSnapshot,
  CopilotUsage,
  GithubCopilotAccountUsage,
  ZaiUsageDetail,
  ZaiLimit,
  ZaiUsage,
  ZaiAccountUsage,
  AiStudioModelLimit,
  AiStudioUsage,
  AiStudioAccountUsage,
  CodexRateWindow,
  CodexRateLimit,
  CodexUsageData,
  CodexAccountUsage,
  OpencodeGoLimit,
  OpencodeGoUsage,
  OpencodeGoAccountUsage
} from './usage'

// Settings types
export type { Settings } from './settings'
export { DEFAULT_SETTINGS } from './settings'

// Customization types
export type {
  CardId,
  GridColumns,
  CardSize,
  OverviewLayout,
  Theme,
  ProgressStyle,
  CardRadius,
  ValueFormat,
  TimeFormat,
  CardClickAction,
  CardSortBy,
  AutoRefresh,
  GlobalConfig,
  ProviderConfig,
  CardConfig,
  CustomizationState,
  EffectiveCardConfig
} from './customization'
export { DEFAULT_GLOBAL_CONFIG } from './customization'

// Error types
export type {
  ErrorSeverity,
  AppError,
  ErrorAction,
  TranslatableError
} from './errors'
export {
  ErrorCode,
  ERROR_I18N_KEYS,
  createAppError,
  parseError,
  isAppError
} from './errors'
