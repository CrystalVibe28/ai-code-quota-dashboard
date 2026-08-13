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
  OllamaCloudAccount,
  Account,
  AntigravityAccountUpdate,
  GithubCopilotAccountUpdate,
  ZaiCodingAccountUpdate,
  CodexAccountUpdate,
  OpencodeGoAccountUpdate,
  OllamaCloudAccountUpdate,
  AiStudioAccountUpdate,
  LoginResult,
  AntigravityLoginResult,
  GithubCopilotLoginResult,
  CodexLoginResult,
  OpencodeGoLoginResult,
  OllamaCloudLoginResult
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
  OpencodeGoAccountUsage,
  OllamaCloudLimit,
  OllamaCloudUsage,
  OllamaCloudAccountUsage,
  UsageSnapshot,
  QuotaHistoryPeriod,
  QuotaHistoryPoint,
  QuotaSyncAuditPoint,
  QuotaSyncAudit,
  QuotaHistory,
  CachedAccountUsage,
  LocalUsageCache,
  UsageApiResponse
} from './usage'

// Settings types
export type { Settings } from './settings'
export {
  DEFAULT_SETTINGS,
  MIN_REFRESH_INTERVAL,
  MAX_REFRESH_INTERVAL
} from './settings'

// Authentication types
export type { StorageUnlockResult } from './auth'

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

// Tray popover types
export type { TrayPopoverViewModel } from './tray'

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
