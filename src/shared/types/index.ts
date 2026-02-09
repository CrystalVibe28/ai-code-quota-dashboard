// src/shared/types/index.ts
// Central export file for all shared types

// Account types
export type {
  ProviderId,
  BaseAccount,
  AntigravityAccount,
  GithubCopilotAccount,
  ZaiCodingAccount,
  Account,
  AntigravityAccountUpdate,
  GithubCopilotAccountUpdate,
  ZaiCodingAccountUpdate,
  LoginResult,
  AntigravityLoginResult,
  GithubCopilotLoginResult
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
  ZaiAccountUsage
} from './usage'

// Settings types
export type { Settings } from './settings'
export { DEFAULT_SETTINGS } from './settings'

// Customization types
export type {
  CardId,
  GridColumns,
  CardSize,
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
