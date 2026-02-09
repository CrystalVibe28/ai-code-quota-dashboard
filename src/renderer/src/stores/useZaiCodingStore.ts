import type { ZaiCodingAccount, ZaiAccountUsage } from '@shared/types'
import { ErrorCode } from '@shared/types'
import { useErrorStore } from './useErrorStore'
import { createProviderStore } from './createProviderStore'

type ZaiCodingAccountUpdate = Partial<Pick<ZaiCodingAccount, 'displayName' | 'showInOverview' | 'selectedLimits' | 'name'>>

export const useZaiCodingStore = createProviderStore<
  ZaiCodingAccount,
  ZaiAccountUsage,
  {
    addAccount: (name: string, apiKey: string) => Promise<{ success: boolean; error?: string }>
    updateAccount: (accountId: string, data: ZaiCodingAccountUpdate) => Promise<boolean>
  }
>(
  {
    providerId: 'zaiCoding',
    providerName: 'Zai Coding Plan',
    fetchUsageApi: () => window.api.zaiCoding.fetchAllUsage(),
    handleUsageError: (errorMessage) => {
      if (errorMessage.includes('invalid') || errorMessage.includes('401')) {
        useErrorStore.getState().showError(ErrorCode.PROVIDER_ZAI_INVALID_KEY, 'Invalid API key')
        return true
      }
      return false
    }
  },
  (set, get, baseActions) => ({
    updateAccount: async (accountId: string, data: ZaiCodingAccountUpdate) => {
      return baseActions.updateAccount(accountId, data)
    },

    addAccount: async (name: string, apiKey: string) => {
      set({ isLoading: true, error: null })
      try {
        const validation = await window.api.zaiCoding.validateApiKey(apiKey)
        if (!validation.valid) {
          const errorMessage = validation.error || 'Invalid API key'
          set({ isLoading: false, error: errorMessage })
          useErrorStore.getState().showError(ErrorCode.PROVIDER_ZAI_INVALID_KEY, errorMessage)
          return { success: false, error: errorMessage }
        }

        const account: ZaiCodingAccount = {
          id: crypto.randomUUID(),
          name,
          displayName: name,
          apiKey,
          showInOverview: true,
          selectedLimits: ['TOKENS_LIMIT', 'TIME_LIMIT']
        }

        await window.api.storage.saveAccount('zaiCoding', account)
        await get().fetchAccounts()
        set({ isLoading: false })
        return { success: true }
      } catch (error) {
        const errorMessage = String(error)
        set({ error: errorMessage, isLoading: false })
        useErrorStore.getState().showError(ErrorCode.ACCOUNT_SAVE_FAILED, errorMessage)
        return { success: false, error: errorMessage }
      }
    }
  })
)

