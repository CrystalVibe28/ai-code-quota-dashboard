import { create } from 'zustand'
import { ErrorCode } from '@shared/types'
import { useErrorStore } from './useErrorStore'

interface AuthState {
  isUnlocked: boolean
  isLoading: boolean
  hasPassword: boolean
  isPasswordSkipped: boolean
  error: string | null
  checkAuth: () => Promise<void>
  unlock: (password: string) => Promise<boolean>
  setPassword: (password: string) => Promise<boolean>
  skipPassword: () => Promise<boolean>
  lock: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isUnlocked: false,
  isLoading: true,
  hasPassword: false,
  isPasswordSkipped: false,
  error: null,

  checkAuth: async () => {
    try {
      const hasPassword = await window.api.auth.hasPassword()
      const isPasswordSkipped = await window.api.auth.isPasswordSkipped()
      set({ hasPassword, isPasswordSkipped, isLoading: false, error: null })
    } catch (error) {
      set({ hasPassword: false, isPasswordSkipped: false, isLoading: false })
      useErrorStore.getState().showError(
        ErrorCode.STORAGE_READ_FAILED,
        'Failed to check authentication status',
        { showToast: false }
      )
    }
  },

  unlock: async (password: string) => {
    set({ error: null })
    try {
      const result = await window.api.auth.verifyPassword(password)
      if (result) {
        set({ isUnlocked: true })
      } else {
        set({ error: 'errors.auth.invalidPassword' })
      }
      return result
    } catch (error) {
      const errorMessage = 'Failed to verify password'
      set({ error: errorMessage })
      useErrorStore.getState().showError(ErrorCode.AUTH_FAILED, errorMessage)
      return false
    }
  },

  setPassword: async (password: string) => {
    set({ error: null })
    try {
      const result = await window.api.auth.setPassword(password)
      if (result) {
        set({ hasPassword: true, isUnlocked: true, isPasswordSkipped: false })
      } else {
        set({ error: 'Failed to set password' })
      }
      return result
    } catch (error) {
      const errorMessage = 'Failed to set password'
      set({ error: errorMessage })
      useErrorStore.getState().showError(ErrorCode.STORAGE_WRITE_FAILED, errorMessage)
      return false
    }
  },

  skipPassword: async () => {
    set({ error: null })
    try {
      const result = await window.api.auth.skipPassword()
      if (result) {
        set({ hasPassword: true, isUnlocked: true, isPasswordSkipped: true })
      } else {
        set({ error: 'Failed to skip password' })
      }
      return result
    } catch (error) {
      const errorMessage = 'Failed to skip password setup'
      set({ error: errorMessage })
      useErrorStore.getState().showError(ErrorCode.STORAGE_WRITE_FAILED, errorMessage)
      return false
    }
  },

  lock: async () => {
    try {
      await window.api.auth.lock()
      set({ isUnlocked: false, error: null })
    } catch (error) {
      useErrorStore.getState().showErrorFromException(error)
    }
  },
  
  clearError: () => {
    set({ error: null })
  }
}))
