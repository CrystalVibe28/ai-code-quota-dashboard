// src/shared/types/errors.ts
// Error type definitions for application-wide error handling

/**
 * Error codes for different error categories
 */
export enum ErrorCode {
  // General errors (1000-1999)
  UNKNOWN = 'ERR_UNKNOWN',
  NETWORK = 'ERR_NETWORK',
  TIMEOUT = 'ERR_TIMEOUT',
  VALIDATION = 'ERR_VALIDATION',
  
  // Authentication errors (2000-2999)
  AUTH_FAILED = 'ERR_AUTH_FAILED',
  AUTH_EXPIRED = 'ERR_AUTH_EXPIRED',
  AUTH_CANCELLED = 'ERR_AUTH_CANCELLED',
  AUTH_INVALID_PASSWORD = 'ERR_AUTH_INVALID_PASSWORD',
  AUTH_PASSWORD_TOO_SHORT = 'ERR_AUTH_PASSWORD_TOO_SHORT',
  
  // OAuth errors (3000-3999)
  OAUTH_FAILED = 'ERR_OAUTH_FAILED',
  OAUTH_CANCELLED = 'ERR_OAUTH_CANCELLED',
  OAUTH_TIMEOUT = 'ERR_OAUTH_TIMEOUT',
  OAUTH_TOKEN_EXPIRED = 'ERR_OAUTH_TOKEN_EXPIRED',
  OAUTH_TOKEN_REFRESH_FAILED = 'ERR_OAUTH_TOKEN_REFRESH_FAILED',
  OAUTH_INVALID_STATE = 'ERR_OAUTH_INVALID_STATE',
  OAUTH_ACCESS_DENIED = 'ERR_OAUTH_ACCESS_DENIED',
  OAUTH_SCOPE_ERROR = 'ERR_OAUTH_SCOPE_ERROR',
  
  // API errors (4000-4999)
  API_ERROR = 'ERR_API',
  API_RATE_LIMIT = 'ERR_API_RATE_LIMIT',
  API_UNAUTHORIZED = 'ERR_API_UNAUTHORIZED',
  API_FORBIDDEN = 'ERR_API_FORBIDDEN',
  API_NOT_FOUND = 'ERR_API_NOT_FOUND',
  API_SERVER_ERROR = 'ERR_API_SERVER_ERROR',
  API_INVALID_RESPONSE = 'ERR_API_INVALID_RESPONSE',
  
  // Account errors (5000-5999)
  ACCOUNT_NOT_FOUND = 'ERR_ACCOUNT_NOT_FOUND',
  ACCOUNT_EXISTS = 'ERR_ACCOUNT_EXISTS',
  ACCOUNT_SAVE_FAILED = 'ERR_ACCOUNT_SAVE_FAILED',
  ACCOUNT_DELETE_FAILED = 'ERR_ACCOUNT_DELETE_FAILED',
  ACCOUNT_UPDATE_FAILED = 'ERR_ACCOUNT_UPDATE_FAILED',
  
  // Storage errors (6000-6999)
  STORAGE_READ_FAILED = 'ERR_STORAGE_READ',
  STORAGE_WRITE_FAILED = 'ERR_STORAGE_WRITE',
  STORAGE_ENCRYPTION_FAILED = 'ERR_STORAGE_ENCRYPTION',
  STORAGE_DECRYPTION_FAILED = 'ERR_STORAGE_DECRYPTION',
  
  // Provider-specific errors (7000-7999)
  PROVIDER_COPILOT_NO_SUBSCRIPTION = 'ERR_COPILOT_NO_SUBSCRIPTION',
  PROVIDER_COPILOT_QUOTA_EXCEEDED = 'ERR_COPILOT_QUOTA_EXCEEDED',
  PROVIDER_ANTIGRAVITY_PROJECT_ERROR = 'ERR_ANTIGRAVITY_PROJECT',
  PROVIDER_ZAI_INVALID_KEY = 'ERR_ZAI_INVALID_KEY'
}

/**
 * Error severity levels for UI display
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

/**
 * Application error structure
 */
export interface AppError {
  code: ErrorCode
  message: string
  severity: ErrorSeverity
  details?: string
  timestamp: number
  recoverable: boolean
  action?: ErrorAction
}

/**
 * Suggested action for error recovery
 */
export interface ErrorAction {
  label: string
  type: 'retry' | 'reauth' | 'navigate' | 'dismiss' | 'custom'
  handler?: string // function name or navigation path
}

/**
 * Error with i18n key for translation
 */
export interface TranslatableError {
  code: ErrorCode
  i18nKey: string
  i18nParams?: Record<string, string | number>
  severity: ErrorSeverity
  recoverable: boolean
  action?: ErrorAction
}

/**
 * Maps error codes to their i18n translation keys
 */
export const ERROR_I18N_KEYS: Record<ErrorCode, string> = {
  // General errors
  [ErrorCode.UNKNOWN]: 'errors.unknown',
  [ErrorCode.NETWORK]: 'errors.network',
  [ErrorCode.TIMEOUT]: 'errors.timeout',
  [ErrorCode.VALIDATION]: 'errors.validation',
  
  // Auth errors
  [ErrorCode.AUTH_FAILED]: 'errors.auth.failed',
  [ErrorCode.AUTH_EXPIRED]: 'errors.auth.expired',
  [ErrorCode.AUTH_CANCELLED]: 'errors.auth.cancelled',
  [ErrorCode.AUTH_INVALID_PASSWORD]: 'errors.auth.invalidPassword',
  [ErrorCode.AUTH_PASSWORD_TOO_SHORT]: 'errors.auth.passwordTooShort',
  
  // OAuth errors
  [ErrorCode.OAUTH_FAILED]: 'errors.oauth.failed',
  [ErrorCode.OAUTH_CANCELLED]: 'errors.oauth.cancelled',
  [ErrorCode.OAUTH_TIMEOUT]: 'errors.oauth.timeout',
  [ErrorCode.OAUTH_TOKEN_EXPIRED]: 'errors.oauth.tokenExpired',
  [ErrorCode.OAUTH_TOKEN_REFRESH_FAILED]: 'errors.oauth.tokenRefreshFailed',
  [ErrorCode.OAUTH_INVALID_STATE]: 'errors.oauth.invalidState',
  [ErrorCode.OAUTH_ACCESS_DENIED]: 'errors.oauth.accessDenied',
  [ErrorCode.OAUTH_SCOPE_ERROR]: 'errors.oauth.scopeError',
  
  // API errors
  [ErrorCode.API_ERROR]: 'errors.api.general',
  [ErrorCode.API_RATE_LIMIT]: 'errors.api.rateLimit',
  [ErrorCode.API_UNAUTHORIZED]: 'errors.api.unauthorized',
  [ErrorCode.API_FORBIDDEN]: 'errors.api.forbidden',
  [ErrorCode.API_NOT_FOUND]: 'errors.api.notFound',
  [ErrorCode.API_SERVER_ERROR]: 'errors.api.serverError',
  [ErrorCode.API_INVALID_RESPONSE]: 'errors.api.invalidResponse',
  
  // Account errors
  [ErrorCode.ACCOUNT_NOT_FOUND]: 'errors.account.notFound',
  [ErrorCode.ACCOUNT_EXISTS]: 'errors.account.exists',
  [ErrorCode.ACCOUNT_SAVE_FAILED]: 'errors.account.saveFailed',
  [ErrorCode.ACCOUNT_DELETE_FAILED]: 'errors.account.deleteFailed',
  [ErrorCode.ACCOUNT_UPDATE_FAILED]: 'errors.account.updateFailed',
  
  // Storage errors
  [ErrorCode.STORAGE_READ_FAILED]: 'errors.storage.readFailed',
  [ErrorCode.STORAGE_WRITE_FAILED]: 'errors.storage.writeFailed',
  [ErrorCode.STORAGE_ENCRYPTION_FAILED]: 'errors.storage.encryptionFailed',
  [ErrorCode.STORAGE_DECRYPTION_FAILED]: 'errors.storage.decryptionFailed',
  
  // Provider errors
  [ErrorCode.PROVIDER_COPILOT_NO_SUBSCRIPTION]: 'errors.provider.copilotNoSubscription',
  [ErrorCode.PROVIDER_COPILOT_QUOTA_EXCEEDED]: 'errors.provider.copilotQuotaExceeded',
  [ErrorCode.PROVIDER_ANTIGRAVITY_PROJECT_ERROR]: 'errors.provider.antigravityProjectError',
  [ErrorCode.PROVIDER_ZAI_INVALID_KEY]: 'errors.provider.zaiInvalidKey'
}

/**
 * Create an AppError from an error code
 */
export function createAppError(
  code: ErrorCode,
  message?: string,
  options?: Partial<Omit<AppError, 'code' | 'timestamp'>>
): AppError {
  const defaultSeverity = getDefaultSeverity(code)
  const defaultRecoverable = isRecoverableByDefault(code)
  
  return {
    code,
    message: message || ERROR_I18N_KEYS[code],
    severity: options?.severity ?? defaultSeverity,
    details: options?.details,
    timestamp: Date.now(),
    recoverable: options?.recoverable ?? defaultRecoverable,
    action: options?.action
  }
}

/**
 * Parse an unknown error into an AppError
 */
export function parseError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }
  
  if (error instanceof Error) {
    // Try to detect error type from message
    const code = detectErrorCode(error.message)
    return createAppError(code, error.message, {
      details: error.stack
    })
  }
  
  if (typeof error === 'string') {
    const code = detectErrorCode(error)
    return createAppError(code, error)
  }
  
  return createAppError(ErrorCode.UNKNOWN, 'An unknown error occurred')
}

/**
 * Check if a value is an AppError
 */
export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    'severity' in value &&
    'timestamp' in value
  )
}

/**
 * Detect error code from error message
 */
function detectErrorCode(message: string): ErrorCode {
  const lowerMessage = message.toLowerCase()
  
  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return ErrorCode.NETWORK
  }
  if (lowerMessage.includes('timeout')) {
    return ErrorCode.TIMEOUT
  }
  
  // OAuth errors
  if (lowerMessage.includes('cancelled') || lowerMessage.includes('canceled')) {
    return ErrorCode.OAUTH_CANCELLED
  }
  if (lowerMessage.includes('access_denied') || lowerMessage.includes('access denied')) {
    return ErrorCode.OAUTH_ACCESS_DENIED
  }
  if (lowerMessage.includes('token expired') || lowerMessage.includes('token_expired')) {
    return ErrorCode.OAUTH_TOKEN_EXPIRED
  }
  
  // API errors
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
    return ErrorCode.API_RATE_LIMIT
  }
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
    return ErrorCode.API_UNAUTHORIZED
  }
  if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
    return ErrorCode.API_FORBIDDEN
  }
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return ErrorCode.API_NOT_FOUND
  }
  if (lowerMessage.includes('500') || lowerMessage.includes('server error')) {
    return ErrorCode.API_SERVER_ERROR
  }
  
  // Provider errors
  if (lowerMessage.includes('no copilot') || lowerMessage.includes('subscription')) {
    return ErrorCode.PROVIDER_COPILOT_NO_SUBSCRIPTION
  }
  if (lowerMessage.includes('invalid api key') || lowerMessage.includes('invalid key')) {
    return ErrorCode.PROVIDER_ZAI_INVALID_KEY
  }
  
  return ErrorCode.UNKNOWN
}

/**
 * Get default severity for an error code
 */
function getDefaultSeverity(code: ErrorCode): ErrorSeverity {
  switch (code) {
    case ErrorCode.OAUTH_CANCELLED:
    case ErrorCode.AUTH_CANCELLED:
      return 'info'
      
    case ErrorCode.NETWORK:
    case ErrorCode.TIMEOUT:
    case ErrorCode.API_RATE_LIMIT:
    case ErrorCode.OAUTH_TIMEOUT:
      return 'warning'
      
    case ErrorCode.STORAGE_ENCRYPTION_FAILED:
    case ErrorCode.STORAGE_DECRYPTION_FAILED:
    case ErrorCode.API_SERVER_ERROR:
      return 'critical'
      
    default:
      return 'error'
  }
}

/**
 * Check if an error is recoverable by default
 */
function isRecoverableByDefault(code: ErrorCode): boolean {
  switch (code) {
    case ErrorCode.STORAGE_ENCRYPTION_FAILED:
    case ErrorCode.STORAGE_DECRYPTION_FAILED:
      return false
      
    case ErrorCode.NETWORK:
    case ErrorCode.TIMEOUT:
    case ErrorCode.API_RATE_LIMIT:
    case ErrorCode.API_SERVER_ERROR:
    case ErrorCode.OAUTH_TIMEOUT:
    case ErrorCode.OAUTH_CANCELLED:
    case ErrorCode.AUTH_CANCELLED:
      return true
      
    default:
      return true
  }
}
