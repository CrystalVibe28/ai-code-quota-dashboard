import { create } from 'zustand'

interface AuthState {
  isUnlocked: boolean
  isLoading: boolean
  hasPassword: boolean
  isPasswordSkipped: boolean
  checkAuth: () => Promise<void>
  unlock: (password: string) => Promise<boolean>
  setPassword: (password: string) => Promise<boolean>
  skipPassword: () => Promise<boolean>
  lock: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isUnlocked: false,
  isLoading: true,
  hasPassword: false,
  isPasswordSkipped: false,

  checkAuth: async () => {
    try {
      const hasPassword = await window.api.auth.hasPassword()
      const isPasswordSkipped = await window.api.auth.isPasswordSkipped()
      set({ hasPassword, isPasswordSkipped, isLoading: false })
    } catch {
      set({ hasPassword: false, isPasswordSkipped: false, isLoading: false })
    }
  },

  unlock: async (password: string) => {
    try {
      const result = await window.api.auth.verifyPassword(password)
      if (result) {
        set({ isUnlocked: true })
      }
      return result
    } catch {
      return false
    }
  },

  setPassword: async (password: string) => {
    try {
      const result = await window.api.auth.setPassword(password)
      if (result) {
        set({ hasPassword: true, isUnlocked: true, isPasswordSkipped: false })
      }
      return result
    } catch {
      return false
    }
  },

  skipPassword: async () => {
    try {
      const result = await window.api.auth.skipPassword()
      if (result) {
        set({ hasPassword: true, isUnlocked: true, isPasswordSkipped: true })
      }
      return result
    } catch {
      return false
    }
  },

  lock: async () => {
    await window.api.auth.lock()
    set({ isUnlocked: false })
  }
}))
