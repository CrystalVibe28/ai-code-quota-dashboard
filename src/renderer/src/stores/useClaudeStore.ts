import type { ClaudeAccount, ClaudeAccountUsage } from '@shared/types'
import {
  type OAuthProviderState,
  createOAuthProviderStore
} from './createProviderStore'

type ClaudeState = OAuthProviderState<ClaudeAccount, ClaudeAccountUsage>

export const useClaudeStore = createOAuthProviderStore<ClaudeAccount, ClaudeAccountUsage>({
  providerId: 'claude',
  providerName: 'Claude',
  fetchUsageApi: () => window.api.claude.fetchAllUsage(),
  loginApi: () => window.api.claude.login(),
  handleUsageError: error => error.includes('Claude Code')
})

export type { ClaudeState }
