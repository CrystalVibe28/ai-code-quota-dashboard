import { create } from 'zustand'

interface GithubCopilotAccount {
  id: string
  login: string
  email: string
  name: string
  displayName: string
  avatarUrl?: string
  showInOverview: boolean
  selectedQuotas: string[]
}

interface QuotaSnapshot {
  entitlement: number
  remaining: number
  percent_remaining: number
  unlimited: boolean
}

interface CopilotUsage {
  accessTypeSku: string
  copilotPlan: string
  quotaResetDate: string
  quotaSnapshots: Record<string, QuotaSnapshot>
}

interface AccountUsage {
  accountId: string
  name: string
  login: string
  usage: CopilotUsage | null
}

interface GithubCopilotState {
  accounts: GithubCopilotAccount[]
  usageData: AccountUsage[]
  isLoading: boolean
  error: string | null
  fetchAccounts: () => Promise<void>
  fetchUsage: () => Promise<void>
  login: () => Promise<{ success: boolean; account?: unknown; error?: string }>
  deleteAccount: (accountId: string) => Promise<boolean>
  updateAccount: (accountId: string, data: Partial<GithubCopilotAccount>) => Promise<boolean>
}

export const useGithubCopilotStore = create<GithubCopilotState>((set, get) => ({
  accounts: [],
  usageData: [],
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    try {
      const accounts = await window.api.storage.getAccounts('githubCopilot')
      set({ accounts: accounts as GithubCopilotAccount[] })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  fetchUsage: async () => {
    set({ isLoading: true, error: null })
    try {
      const usageData = await window.api.githubCopilot.fetchAllUsage()
      set({ usageData: usageData as AccountUsage[], isLoading: false })
    } catch (error) {
      set({ error: String(error), isLoading: false })
    }
  },

  login: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.api.githubCopilot.login()
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
      const result = await window.api.storage.deleteAccount('githubCopilot', accountId)
      if (result) {
        await get().fetchAccounts()
      }
      return result
    } catch {
      return false
    }
  },

  updateAccount: async (accountId: string, data: Partial<GithubCopilotAccount>) => {
    try {
      const result = await window.api.storage.updateAccount('githubCopilot', accountId, data)
      if (result) {
        await get().fetchAccounts()
      }
      return result
    } catch {
      return false
    }
  }
}))
