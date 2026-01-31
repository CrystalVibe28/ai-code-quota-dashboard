import { create } from 'zustand'

interface AntigravityAccount {
  id: string
  email: string
  name: string
  picture?: string
  showInOverview: boolean
  selectedModels: string[]
}

interface ModelQuota {
  modelName: string
  remainingFraction: number
  resetTime?: string
}

interface AccountUsage {
  accountId: string
  name: string
  usage: ModelQuota[] | null
}

interface AntigravityState {
  accounts: AntigravityAccount[]
  usageData: AccountUsage[]
  isLoading: boolean
  error: string | null
  fetchAccounts: () => Promise<void>
  fetchUsage: () => Promise<void>
  login: () => Promise<{ success: boolean; account?: unknown; error?: string }>
  deleteAccount: (accountId: string) => Promise<boolean>
  updateAccount: (accountId: string, data: Partial<AntigravityAccount>) => Promise<boolean>
}

export const useAntigravityStore = create<AntigravityState>((set, get) => ({
  accounts: [],
  usageData: [],
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    try {
      const accounts = await window.api.storage.getAccounts('antigravity')
      set({ accounts: accounts as AntigravityAccount[] })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  fetchUsage: async () => {
    set({ isLoading: true, error: null })
    try {
      const usageData = await window.api.antigravity.fetchAllUsage()
      set({ usageData: usageData as AccountUsage[], isLoading: false })
    } catch (error) {
      set({ error: String(error), isLoading: false })
    }
  },

  login: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.api.antigravity.login()
      if (result.success) {
        await get().fetchAccounts()
      }
      set({ isLoading: false })
      return result
    } catch (error) {
      set({ error: String(error), isLoading: false })
      return { success: false, error: String(error) }
    }
  },

  deleteAccount: async (accountId: string) => {
    try {
      const result = await window.api.storage.deleteAccount('antigravity', accountId)
      if (result) {
        await get().fetchAccounts()
      }
      return result
    } catch {
      return false
    }
  },

  updateAccount: async (accountId: string, data: Partial<AntigravityAccount>) => {
    try {
      const result = await window.api.storage.updateAccount('antigravity', accountId, data)
      if (result) {
        await get().fetchAccounts()
      }
      return result
    } catch {
      return false
    }
  }
}))
