import type { GithubCopilotAccount, GithubCopilotAccountUsage, LoginResult } from '@shared/types'
import { createOAuthProviderStore, type OAuthProviderState } from './createProviderStore'

// Use renderer-specific partial type for updates (excludes sensitive fields)
type GithubCopilotAccountUpdate = Partial<Pick<GithubCopilotAccount, 'displayName' | 'showInOverview' | 'selectedQuotas'>>

type GithubCopilotState = OAuthProviderState<GithubCopilotAccount, GithubCopilotAccountUsage>

export const useGithubCopilotStore = createOAuthProviderStore<GithubCopilotAccount, GithubCopilotAccountUsage>({
  providerId: 'githubCopilot',
  providerName: 'GitHub Copilot',
  fetchUsageApi: () => window.api.githubCopilot.fetchAllUsage(),
  loginApi: () => window.api.githubCopilot.login(),
  handleUsageError: (errorMessage) => {
    // Only show toast for non-auth errors (auth errors are handled separately)
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return true // Skip default toast
    }
    return false
  }
})

// Re-export the state type for external usage
export type { GithubCopilotState, GithubCopilotAccountUpdate }
