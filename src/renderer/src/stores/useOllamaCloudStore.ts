import type { OllamaCloudAccount, OllamaCloudAccountUsage } from '@shared/types'
import {
  type OAuthProviderState,
  createOAuthProviderStore
} from './createProviderStore'
import { isOllamaCloudSessionExpired } from '@/lib/ollamaCloudError'

type OllamaCloudState = OAuthProviderState<OllamaCloudAccount, OllamaCloudAccountUsage>

export const useOllamaCloudStore = createOAuthProviderStore<OllamaCloudAccount, OllamaCloudAccountUsage>({
  providerId: 'ollamaCloud',
  providerName: 'Ollama Cloud',
  fetchUsageApi: () => window.api.ollamaCloud.fetchAllUsage(),
  loginApi: () => window.api.ollamaCloud.login(),
  cancelLoginApi: () => window.api.ollamaCloud.cancelLogin(),
  handleUsageError: isOllamaCloudSessionExpired
})

export type { OllamaCloudState }
