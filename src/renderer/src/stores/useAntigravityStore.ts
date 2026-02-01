import { create } from 'zustand'
import type { 
  AntigravityAccount, 
  ModelQuota,
  AntigravityUsage,
  LoginResult
} from '@shared/types'

// Use renderer-specific partial type for updates (excludes sensitive fields)
type AntigravityAccountUpdate = Partial<Pick<AntigravityAccount, 'displayName' | 'showInOverview' | 'selectedModels'>>

interface AntigravityState {
  accounts: AntigravityAccount[]
  usageData: AntigravityUsage[]
  isLoading: boolean
  error: string | null
  fetchAccounts: () => Promise<void>
  fetchUsage: () => Promise<void>
  login: () => Promise<LoginResult<AntigravityAccount>>
  deleteAccount: (accountId: string) => Promise<boolean>
  updateAccount: (accountId: string, data: AntigravityAccountUpdate) => Promise<boolean>
}

export const useAntigravityStore = create<AntigravityState>((set, get) => ({
  accounts: [],
  usageData: [],
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    try {
      const accounts = await window.api.storage.getAccounts<AntigravityAccount>('antigravity')
      set({ accounts })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  fetchUsage: async () => {
    set({ isLoading: true, error: null })
    try {
      const usageData = await window.api.antigravity.fetchAllUsage()
      set({ usageData, isLoading: false })
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

  updateAccount: async (accountId: string, data: AntigravityAccountUpdate) => {
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
