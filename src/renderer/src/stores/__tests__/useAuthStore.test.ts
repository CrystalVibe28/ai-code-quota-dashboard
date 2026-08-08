import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../useAuthStore'
import { useAntigravityStore } from '../useAntigravityStore'
import { useCodexStore } from '../useCodexStore'
import { useCustomizationStore } from '../useCustomizationStore'
import { useGithubCopilotStore } from '../useGithubCopilotStore'
import { useOpencodeGoStore } from '../useOpencodeGoStore'
import { useSettingsStore } from '../useSettingsStore'
import { useZaiCodingStore } from '../useZaiCodingStore'
import { DEFAULT_SETTINGS } from '@shared/types'
import { mockWindowApi } from '../../../../test/mocks/window-api'

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      isUnlocked: false,
      isLoading: true,
      hasPassword: false,
      isPasswordSkipped: false,
      isUpdateRequired: false,
      error: null
    })
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useAuthStore.getState()
      expect(state.isUnlocked).toBe(false)
      expect(state.isLoading).toBe(true)
      expect(state.hasPassword).toBe(false)
      expect(state.isPasswordSkipped).toBe(false)
      expect(state.isUpdateRequired).toBe(false)
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
      mockWindowApi.auth.unlockWithSkippedPassword.mockResolvedValue({ success: true })

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.hasPassword).toBe(true)
      expect(state.isPasswordSkipped).toBe(true)
      expect(state.isUnlocked).toBe(true)
      expect(state.isLoading).toBe(false)
      expect(mockWindowApi.auth.unlockWithSkippedPassword).toHaveBeenCalled()
    })

    it('should require an update when skipped-password data is from a newer version', async () => {
      mockWindowApi.auth.hasPassword.mockResolvedValue(true)
      mockWindowApi.auth.isPasswordSkipped.mockResolvedValue(true)
      mockWindowApi.auth.unlockWithSkippedPassword.mockResolvedValue({
        success: false,
        reason: 'data-version-too-new'
      })

      await useAuthStore.getState().checkAuth()

      expect(useAuthStore.getState()).toMatchObject({
        isUnlocked: false,
        isLoading: false,
        isUpdateRequired: true
      })
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
      mockWindowApi.auth.verifyPassword.mockResolvedValue({ success: true })

      const result = await useAuthStore.getState().unlock('correct-password')

      expect(result).toBe(true)
      expect(useAuthStore.getState().isUnlocked).toBe(true)
      expect(mockWindowApi.auth.verifyPassword).toHaveBeenCalledWith('correct-password')
    })

    it('should not unlock on failed verification', async () => {
      mockWindowApi.auth.verifyPassword.mockResolvedValue({
        success: false,
        reason: 'invalid-password'
      })

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

  describe('changePassword', () => {
    it('should call window.api.auth.changePassword and return true on success', async () => {
      mockWindowApi.auth.changePassword.mockResolvedValue(true)

      const result = await useAuthStore.getState().changePassword('old-password', 'new-password')

      expect(result).toBe(true)
      expect(mockWindowApi.auth.changePassword).toHaveBeenCalledWith('old-password', 'new-password')
    })

    it('should set error and return false when password is invalid', async () => {
      mockWindowApi.auth.changePassword.mockResolvedValue(false)

      const result = await useAuthStore.getState().changePassword('wrong-password', 'new-password')

      expect(result).toBe(false)
      const state = useAuthStore.getState()
      expect(state.error).toBeTruthy()
    })
  })

  describe('removePassword', () => {
    it('should call window.api.auth.removePassword and set isPasswordSkipped to true', async () => {
      mockWindowApi.auth.removePassword.mockResolvedValue(true)

      const result = await useAuthStore.getState().removePassword('current-password')

      expect(result).toBe(true)
      expect(mockWindowApi.auth.removePassword).toHaveBeenCalledWith('current-password')
      const state = useAuthStore.getState()
      expect(state.isPasswordSkipped).toBe(true)
    })

    it('should set error and return false when password is invalid', async () => {
      mockWindowApi.auth.removePassword.mockResolvedValue(false)

      const result = await useAuthStore.getState().removePassword('wrong-password')

      expect(result).toBe(false)
      const state = useAuthStore.getState()
      expect(state.error).toBeTruthy()
    })
  })

  describe('setPasswordFromSettings', () => {
    it('should call window.api.auth.setPasswordFromSettings and set isPasswordSkipped to false', async () => {
      mockWindowApi.auth.setPasswordFromSettings.mockResolvedValue(true)

      const result = await useAuthStore.getState().setPasswordFromSettings('new-password')

      expect(result).toBe(true)
      expect(mockWindowApi.auth.setPasswordFromSettings).toHaveBeenCalledWith('new-password')
      const state = useAuthStore.getState()
      expect(state.isPasswordSkipped).toBe(false)
    })

    it('should set error and return false on failure', async () => {
      mockWindowApi.auth.setPasswordFromSettings.mockResolvedValue(false)

      const result = await useAuthStore.getState().setPasswordFromSettings('new-password')

      expect(result).toBe(false)
      const state = useAuthStore.getState()
      expect(state.error).toBeTruthy()
    })
  })

  describe('clearAllData', () => {
    it('should clear persisted browser data and every provider store', async () => {
      const sensitiveAccount = { id: 'account', accessToken: 'token', apiKey: 'key', cookieHeader: 'cookie' } as never
      useAntigravityStore.setState({ accounts: [sensitiveAccount] })
      useGithubCopilotStore.setState({ accounts: [sensitiveAccount] })
      useZaiCodingStore.setState({ accounts: [sensitiveAccount] })
      useCodexStore.setState({ accounts: [sensitiveAccount] })
      useOpencodeGoStore.setState({ accounts: [sensitiveAccount] })
      useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, language: 'zh-TW' } })
      useCustomizationStore.setState({ cards: { secret: { visible: false } } })
      useAuthStore.setState({
        isUnlocked: true,
        isLoading: false,
        hasPassword: true,
        isPasswordSkipped: true
      })
      localStorage.setItem('language', 'zh-TW')

      const result = await useAuthStore.getState().clearAllData()

      expect(result).toBe(true)
      expect(mockWindowApi.auth.clearAllData).toHaveBeenCalledTimes(1)
      expect(localStorage.length).toBe(0)
      expect(useAntigravityStore.getState().accounts).toEqual([])
      expect(useGithubCopilotStore.getState().accounts).toEqual([])
      expect(useZaiCodingStore.getState().accounts).toEqual([])
      expect(useCodexStore.getState().accounts).toEqual([])
      expect(useOpencodeGoStore.getState().accounts).toEqual([])
      expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS)
      expect(useCustomizationStore.getState().cards).toEqual({})
      expect(useAuthStore.getState()).toMatchObject({
        isUnlocked: false,
        isLoading: false,
        hasPassword: false,
        isPasswordSkipped: false,
        isUpdateRequired: false,
        error: null
      })
    })

    it('should still purge renderer secrets when main-process cleanup fails', async () => {
      const sensitiveAccount = { id: 'account', accessToken: 'token' } as never
      useAntigravityStore.setState({ accounts: [sensitiveAccount] })
      useAuthStore.setState({ isUnlocked: true, isLoading: false, hasPassword: true })
      localStorage.setItem('secret', 'value')
      mockWindowApi.auth.clearAllData.mockRejectedValueOnce(new Error('cleanup failed'))

      const result = await useAuthStore.getState().clearAllData()

      expect(result).toBe(false)
      expect(localStorage.length).toBe(0)
      expect(useAntigravityStore.getState().accounts).toEqual([])
      expect(useAuthStore.getState()).toMatchObject({ isUnlocked: false, isLoading: false })
    })

    it('should ignore provider account responses that finish after cleanup', async () => {
      const sensitiveAccount = { id: 'account', accessToken: 'token' } as never
      let resolveAccounts: (accounts: never[]) => void = () => {}
      mockWindowApi.storage.getAccounts.mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveAccounts = resolve
        })
      )

      const fetchPromise = useAntigravityStore.getState().fetchAccounts()
      await useAuthStore.getState().clearAllData()
      resolveAccounts([sensitiveAccount])
      await fetchPromise

      expect(useAntigravityStore.getState().accounts).toEqual([])
    })
  })
})
