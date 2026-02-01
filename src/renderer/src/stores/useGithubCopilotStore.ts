import { create } from 'zustand'
import type { 
  GithubCopilotAccount, 
  CopilotUsage,
  GithubCopilotAccountUsage,
  LoginResult
} from '@shared/types'

// Use renderer-specific partial type for updates (excludes sensitive fields)
type GithubCopilotAccountUpdate = Partial<Pick<GithubCopilotAccount, 'displayName' | 'showInOverview' | 'selectedQuotas'>>

interface GithubCopilotState {
  accounts: GithubCopilotAccount[]
  usageData: GithubCopilotAccountUsage[]
  isLoading: boolean
  error: string | null
  fetchAccounts: () => Promise<void>
  fetchUsage: () => Promise<void>
  login: () => Promise<LoginResult<GithubCopilotAccount>>
  deleteAccount: (accountId: string) => Promise<boolean>
  updateAccount: (accountId: string, data: GithubCopilotAccountUpdate) => Promise<boolean>
}

export const useGithubCopilotStore = create<GithubCopilotState>((set, get) => ({
  accounts: [],
  usageData: [],
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    try {
      const accounts = await window.api.storage.getAccounts<GithubCopilotAccount>('githubCopilot')
      set({ accounts })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  fetchUsage: async () => {
    set({ isLoading: true, error: null })
    try {
      const usageData = await window.api.githubCopilot.fetchAllUsage()
      set({ usageData, isLoading: false })
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

  updateAccount: async (accountId: string, data: GithubCopilotAccountUpdate) => {
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
