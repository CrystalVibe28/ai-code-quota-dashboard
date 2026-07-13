import type { CodexAccount, CodexAccountUsage, LoginResult } from '@shared/types'
import { ErrorCode } from '@shared/types'
import {
  type OAuthProviderState,
  createOAuthProviderStore
} from './createProviderStore'

// Use renderer-specific partial type for updates (excludes sensitive fields)
type CodexAccountUpdate = Partial<Pick<CodexAccount, 'displayName' | 'showInOverview'>>

type CodexState = OAuthProviderState<CodexAccount, CodexAccountUsage>

export const useCodexStore = createOAuthProviderStore<CodexAccount, CodexAccountUsage>({
  providerId: 'codex',
  providerName: 'Codex',
  fetchUsageApi: () => window.api.codex.fetchAllUsage(),
  loginApi: () => window.api.codex.login(),
  cancelLoginApi: () => window.api.codex.cancelLogin(),
  handleUsageError: (errorMessage) => {
    // Skip default toast for auth errors (will be handled by token refresh)
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return true
    }
    return false
  },
  parseOAuthErrorExtension: (lowerError) => {
    if (lowerError.includes('token') && lowerError.includes('expired')) {
      return ErrorCode.PROVIDER_CODEX_TOKEN_EXPIRED
    }
    if (lowerError.includes('banned') || lowerError.includes('suspended')) {
      return ErrorCode.PROVIDER_CODEX_ACCOUNT_BANNED
    }
    if (lowerError.includes('rate') && lowerError.includes('limit')) {
      return ErrorCode.PROVIDER_CODEX_RATE_LIMITED
    }
    return null
  }
})

// Re-export the state type for external usage
export type { CodexState, CodexAccountUpdate }
