import { create } from 'zustand'

interface ZaiCodingAccount {
  id: string
  name: string
  displayName: string
  apiKey: string
  showInOverview: boolean
  selectedLimits: string[]
}

interface Limit {
  type: string
  usage: number
  currentValue: number
  remaining: number
  percentage: number
  nextResetTime?: number
}

interface ZaiUsage {
  limits: Limit[]
}

interface AccountUsage {
  accountId: string
  name: string
  usage: ZaiUsage | null
}

interface ZaiCodingState {
  accounts: ZaiCodingAccount[]
  usageData: AccountUsage[]
  isLoading: boolean
  error: string | null
  fetchAccounts: () => Promise<void>
  fetchUsage: () => Promise<void>
  addAccount: (name: string, apiKey: string) => Promise<{ success: boolean; error?: string }>
  deleteAccount: (accountId: string) => Promise<boolean>
  updateAccount: (accountId: string, data: Partial<ZaiCodingAccount>) => Promise<boolean>
}

export const useZaiCodingStore = create<ZaiCodingState>((set, get) => ({
  accounts: [],
  usageData: [],
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    try {
      const accounts = await window.api.storage.getAccounts('zaiCoding')
      set({ accounts: accounts as ZaiCodingAccount[] })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  fetchUsage: async () => {
    set({ isLoading: true, error: null })
    try {
      const usageData = await window.api.zaiCoding.fetchAllUsage()
      set({ usageData: usageData as AccountUsage[], isLoading: false })
    } catch (error) {
      set({ error: String(error), isLoading: false })
    }
  },

  addAccount: async (name: string, apiKey: string) => {
    set({ isLoading: true, error: null })
    try {
      const validation = await window.api.zaiCoding.validateApiKey(apiKey)
      if (!validation.valid) {
        set({ isLoading: false })
        return { success: false, error: validation.error }
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
      set({ error: String(error), isLoading: false })
      return { success: false, error: String(error) }
    }
  },

  deleteAccount: async (accountId: string) => {
    try {
      const result = await window.api.storage.deleteAccount('zaiCoding', accountId)
      if (result) {
        await get().fetchAccounts()
      }
      return result
    } catch {
      return false
    }
  },

  updateAccount: async (accountId: string, data: Partial<ZaiCodingAccount>) => {
    try {
      const result = await window.api.storage.updateAccount('zaiCoding', accountId, data)
      if (result) {
        await get().fetchAccounts()
      }
      return result
    } catch {
      return false
    }
  }
}))
