import type { OpencodeGoAccount, OpencodeGoAccountUsage } from '@shared/types'
import { ErrorCode } from '@shared/types'
import { useErrorStore } from './useErrorStore'
import { createProviderStore } from './createProviderStore'

type OpencodeGoAccountUpdate = Partial<Pick<OpencodeGoAccount, 'displayName' | 'showInOverview'>>
type SaveResult = { success: boolean; error?: string }

export const useOpencodeGoStore = createProviderStore<
  OpencodeGoAccount,
  OpencodeGoAccountUsage,
  {
    addAccount: (name: string, apiKey: string) => Promise<SaveResult>
    setApiKey: (accountId: string, apiKey: string) => Promise<SaveResult>
  }
>(
  {
    providerId: 'opencodeGo',
    providerName: 'Opencode Go',
    fetchUsageApi: () => window.api.opencodeGo.fetchAllUsage()
  },
  (set, get) => {
    const saveApiKey = async (name: string, apiKey: string, accountId?: string): Promise<SaveResult> => {
      set({ isLoading: true, error: null })
      try {
        const key = apiKey.trim()
        if (!key) throw new Error('Opencode Go API key required')
        const validation = await window.api.opencodeGo.validateApiKey(key)
        if (!validation.valid) {
          const error = validation.error || 'Invalid API key'
          set({ isLoading: false, error })
          return { success: false, error }
        }
        const saved = accountId
          ? await window.api.storage.updateAccount('opencodeGo', accountId, { apiKey: key })
          : await window.api.storage.saveAccount('opencodeGo', {
              id: crypto.randomUUID(), displayName: name, apiKey: key, showInOverview: true
            } satisfies OpencodeGoAccount)
        if (!saved) throw new Error('Failed to save Opencode Go API key')
        await get().fetchAccounts()
        await get().fetchUsage()
        set({ isLoading: false })
        return { success: true }
      } catch (error) {
        const message = String(error)
        set({ error: message, isLoading: false })
        useErrorStore.getState().showError(ErrorCode.ACCOUNT_SAVE_FAILED, message)
        return { success: false, error: message }
      }
    }
    return {
      addAccount: (name, apiKey) => saveApiKey(name, apiKey),
      setApiKey: (accountId, apiKey) => saveApiKey('', apiKey, accountId)
    }
  }
)

export type { OpencodeGoAccountUpdate }
