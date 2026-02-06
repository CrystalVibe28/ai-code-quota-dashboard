import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../useAuthStore'
import { mockWindowApi } from '../../../../test/mocks/window-api'

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      isUnlocked: false,
      isLoading: true,
      hasPassword: false,
      isPasswordSkipped: false
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useAuthStore.getState()
      expect(state.isUnlocked).toBe(false)
      expect(state.isLoading).toBe(true)
      expect(state.hasPassword).toBe(false)
      expect(state.isPasswordSkipped).toBe(false)
    })
  })

  describe('checkAuth', () => {
    it('should set hasPassword and isPasswordSkipped from API', async () => {
      mockWindowApi.auth.hasPassword.mockResolvedValue(true)
      mockWindowApi.auth.isPasswordSkipped.mockResolvedValue(false)

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.hasPassword).toBe(true)
      expect(state.isPasswordSkipped).toBe(false)
      expect(state.isLoading).toBe(false)
    })

    it('should handle skipped password state and auto-unlock', async () => {
      mockWindowApi.auth.hasPassword.mockResolvedValue(true)
      mockWindowApi.auth.isPasswordSkipped.mockResolvedValue(true)
      mockWindowApi.auth.unlockWithSkippedPassword.mockResolvedValue(true)

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.hasPassword).toBe(true)
      expect(state.isPasswordSkipped).toBe(true)
      expect(state.isUnlocked).toBe(true)
      expect(state.isLoading).toBe(false)
      expect(mockWindowApi.auth.unlockWithSkippedPassword).toHaveBeenCalled()
    })

    it('should handle API error gracefully', async () => {
      mockWindowApi.auth.hasPassword.mockRejectedValue(new Error('API Error'))

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.hasPassword).toBe(false)
      expect(state.isPasswordSkipped).toBe(false)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('unlock', () => {
    it('should set isUnlocked to true on successful verification', async () => {
      mockWindowApi.auth.verifyPassword.mockResolvedValue(true)

      const result = await useAuthStore.getState().unlock('correct-password')

      expect(result).toBe(true)
      expect(useAuthStore.getState().isUnlocked).toBe(true)
      expect(mockWindowApi.auth.verifyPassword).toHaveBeenCalledWith('correct-password')
    })

    it('should not unlock on failed verification', async () => {
      mockWindowApi.auth.verifyPassword.mockResolvedValue(false)

      const result = await useAuthStore.getState().unlock('wrong-password')

      expect(result).toBe(false)
      expect(useAuthStore.getState().isUnlocked).toBe(false)
    })

    it('should return false on API error', async () => {
      mockWindowApi.auth.verifyPassword.mockRejectedValue(new Error('API Error'))

      const result = await useAuthStore.getState().unlock('password')

      expect(result).toBe(false)
      expect(useAuthStore.getState().isUnlocked).toBe(false)
    })
  })

  describe('setPassword', () => {
    it('should set password and unlock on success', async () => {
      mockWindowApi.auth.setPassword.mockResolvedValue(true)

      const result = await useAuthStore.getState().setPassword('new-password')

      expect(result).toBe(true)
      const state = useAuthStore.getState()
      expect(state.hasPassword).toBe(true)
      expect(state.isUnlocked).toBe(true)
      expect(state.isPasswordSkipped).toBe(false)
    })

    it('should not change state on failure', async () => {
      mockWindowApi.auth.setPassword.mockResolvedValue(false)

      const result = await useAuthStore.getState().setPassword('password')

      expect(result).toBe(false)
      expect(useAuthStore.getState().hasPassword).toBe(false)
    })

    it('should return false on API error', async () => {
      mockWindowApi.auth.setPassword.mockRejectedValue(new Error('API Error'))

      const result = await useAuthStore.getState().setPassword('password')

      expect(result).toBe(false)
    })
  })

  describe('skipPassword', () => {
    it('should set skipped state on success', async () => {
      mockWindowApi.auth.skipPassword.mockResolvedValue(true)

      const result = await useAuthStore.getState().skipPassword()

      expect(result).toBe(true)
      const state = useAuthStore.getState()
      expect(state.hasPassword).toBe(true)
      expect(state.isUnlocked).toBe(true)
      expect(state.isPasswordSkipped).toBe(true)
    })

    it('should not change state on failure', async () => {
      mockWindowApi.auth.skipPassword.mockResolvedValue(false)

      const result = await useAuthStore.getState().skipPassword()

      expect(result).toBe(false)
      expect(useAuthStore.getState().isPasswordSkipped).toBe(false)
    })
  })

  describe('lock', () => {
    it('should set isUnlocked to false', async () => {
      // First unlock
      useAuthStore.setState({ isUnlocked: true })

      await useAuthStore.getState().lock()

      expect(useAuthStore.getState().isUnlocked).toBe(false)
      expect(mockWindowApi.auth.lock).toHaveBeenCalled()
    })
  })
})
