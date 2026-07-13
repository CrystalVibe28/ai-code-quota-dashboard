import type { OpencodeGoAccount, OpencodeGoAccountUsage } from '@shared/types'
import {
  type OAuthProviderState,
  createOAuthProviderStore
} from './createProviderStore'

type OpencodeGoAccountUpdate = Partial<Pick<OpencodeGoAccount, 'displayName' | 'showInOverview'>>

type OpencodeGoState = OAuthProviderState<OpencodeGoAccount, OpencodeGoAccountUsage>

export const useOpencodeGoStore = createOAuthProviderStore<OpencodeGoAccount, OpencodeGoAccountUsage>({
  providerId: 'opencodeGo',
  providerName: 'Opencode Go',
  fetchUsageApi: () => window.api.opencodeGo.fetchAllUsage(),
  loginApi: () => window.api.opencodeGo.login(),
  cancelLoginApi: () => window.api.opencodeGo.cancelLogin(),
  handleUsageError: (errorMessage) => {
    const lowerError = errorMessage.toLowerCase()
    return lowerError.includes('session expired') || lowerError.includes('401') || lowerError.includes('unauthorized')
  }
})

export type { OpencodeGoState, OpencodeGoAccountUpdate }
