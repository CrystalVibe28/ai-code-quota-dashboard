import type { AntigravityAccount, AntigravityUsage, LoginResult } from '@shared/types'
import { ErrorCode } from '@shared/types'
import {
  type OAuthProviderState,
  createOAuthProviderStore
} from './createProviderStore'

// Use renderer-specific partial type for updates (excludes sensitive fields)
type AntigravityAccountUpdate = Partial<Pick<AntigravityAccount, 'displayName' | 'showInOverview' | 'selectedModels'>>

type AntigravityState = OAuthProviderState<AntigravityAccount, AntigravityUsage>

export const useAntigravityStore = createOAuthProviderStore<AntigravityAccount, AntigravityUsage>({
  providerId: 'antigravity',
  providerName: 'Antigravity',
  fetchUsageApi: () => window.api.antigravity.fetchAllUsage(),
  loginApi: () => window.api.antigravity.login(),
  handleUsageError: (errorMessage) => {
    // Only show toast for non-auth errors
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return true // Skip default toast
    }
    return false
  },
  parseOAuthErrorExtension: (lowerError) => {
    // Antigravity-specific: check for project errors
    if (lowerError.includes('project')) {
      return ErrorCode.PROVIDER_ANTIGRAVITY_PROJECT_ERROR
    }
    return null
  }
})

// Re-export the state type for external usage
export type { AntigravityState, AntigravityAccountUpdate }
