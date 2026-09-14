import type { CommandCodeAccount, CommandCodeAccountUsage } from '@shared/types'
import { ErrorCode } from '@shared/types'
import { useErrorStore } from './useErrorStore'
import { createProviderStore } from './createProviderStore'

type CommandCodeAccountUpdate = Partial<Pick<CommandCodeAccount, 'displayName' | 'showInOverview' | 'name'>>

export const useCommandCodeStore = createProviderStore<
  CommandCodeAccount,
  CommandCodeAccountUsage,
  {
    addAccount: (name: string, apiKey: string) => Promise<{ success: boolean; error?: string }>
    updateAccount: (accountId: string, data: CommandCodeAccountUpdate) => Promise<boolean>
  }
>(
  {
    providerId: 'commandCode',
    providerName: 'Command Code',
    fetchUsageApi: () => window.api.commandCode.fetchAllUsage(),
    handleUsageError: (errorMessage) => {
      if (/invalid|401|403|unauthorized|forbidden/i.test(errorMessage)) {
        useErrorStore.getState().showError(ErrorCode.API_UNAUTHORIZED, 'Invalid API key')
        return true
      }
      return false
    }
  },
  (set, get, baseActions) => ({
    updateAccount: (accountId: string, data: CommandCodeAccountUpdate) => {
      return baseActions.updateAccount(accountId, data)
    },

    addAccount: async (name: string, apiKey: string) => {
      set({ isLoading: true, error: null })
      try {
        const validation = await window.api.commandCode.validateApiKey(apiKey)
        if (!validation.valid) {
          const errorMessage = validation.error || 'Invalid API key'
          set({ isLoading: false, error: errorMessage })
          useErrorStore.getState().showError(ErrorCode.API_UNAUTHORIZED, errorMessage)
          return { success: false, error: errorMessage }
        }

        const account: CommandCodeAccount = {
          id: crypto.randomUUID(),
          name,
          displayName: name,
          apiKey,
          showInOverview: true
        }

        await window.api.storage.saveAccount('commandCode', account)
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

export type { CommandCodeAccountUpdate }
