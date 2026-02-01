import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockWindowApi } from '../../../../test/mocks/window-api'
import { DEFAULT_SETTINGS as ACTUAL_DEFAULT_SETTINGS } from '@shared/types'

// Mock i18n before importing the store
vi.mock('@/i18n', () => ({
  default: {
    language: 'en',
    changeLanguage: vi.fn().mockResolvedValue(undefined)
  }
}))

// Import after mocking
import { useSettingsStore } from '../useSettingsStore'

describe('useSettingsStore', () => {
  const DEFAULT_SETTINGS = ACTUAL_DEFAULT_SETTINGS

  beforeEach(() => {
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      isLoading: false
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct default settings', () => {
      const state = useSettingsStore.getState()
      expect(state.settings).toEqual(DEFAULT_SETTINGS)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('fetchSettings', () => {
    it('should load settings from API', async () => {
      const storedSettings = {
        refreshInterval: 120,
        lowQuotaThreshold: 20,
        notifications: false,
        language: 'zh-TW',
        closeToTray: true,
        notificationReminderInterval: 60
      }
      mockWindowApi.storage.getSettings.mockResolvedValue(storedSettings)

      await useSettingsStore.getState().fetchSettings()

      const state = useSettingsStore.getState()
      expect(state.settings).toEqual(storedSettings)
      expect(state.isLoading).toBe(false)
    })

    it('should use default settings when API returns null', async () => {
      mockWindowApi.storage.getSettings.mockResolvedValue(null)

      await useSettingsStore.getState().fetchSettings()

      expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS)
    })

    it('should use default settings on API error', async () => {
      mockWindowApi.storage.getSettings.mockRejectedValue(new Error('API Error'))

      await useSettingsStore.getState().fetchSettings()

      expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS)
      expect(useSettingsStore.getState().isLoading).toBe(false)
    })

    it('should set isLoading during fetch', async () => {
      let resolvePromise: (value: unknown) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockWindowApi.storage.getSettings.mockReturnValue(promise)

      const fetchPromise = useSettingsStore.getState().fetchSettings()
      expect(useSettingsStore.getState().isLoading).toBe(true)

      resolvePromise!(DEFAULT_SETTINGS)
      await fetchPromise

      expect(useSettingsStore.getState().isLoading).toBe(false)
    })
  })

  describe('updateSettings', () => {
    it('should update settings optimistically', async () => {
      mockWindowApi.storage.saveSettings.mockResolvedValue(true)

      await useSettingsStore.getState().updateSettings({ refreshInterval: 300 })

      expect(useSettingsStore.getState().settings.refreshInterval).toBe(300)
      // Other settings should remain unchanged
      expect(useSettingsStore.getState().settings.notifications).toBe(true)
    })

    it('should call API with partial updates', async () => {
      mockWindowApi.storage.saveSettings.mockResolvedValue(true)

      await useSettingsStore.getState().updateSettings({ 
        refreshInterval: 180,
        notifications: false 
      })

      expect(mockWindowApi.storage.saveSettings).toHaveBeenCalledWith({
        refreshInterval: 180,
        notifications: false
      })
    })

    it('should return true on success', async () => {
      mockWindowApi.storage.saveSettings.mockResolvedValue(true)

      const result = await useSettingsStore.getState().updateSettings({ 
        language: 'ja' 
      })

      expect(result).toBe(true)
    })

    it('should return false on API error', async () => {
      mockWindowApi.storage.saveSettings.mockRejectedValue(new Error('Save failed'))

      const result = await useSettingsStore.getState().updateSettings({ 
        language: 'ko' 
      })

      expect(result).toBe(false)
    })

    it('should merge multiple updates correctly', async () => {
      mockWindowApi.storage.saveSettings.mockResolvedValue(true)

      await useSettingsStore.getState().updateSettings({ refreshInterval: 90 })
      await useSettingsStore.getState().updateSettings({ notifications: false })
      await useSettingsStore.getState().updateSettings({ language: 'de' })

      const state = useSettingsStore.getState()
      expect(state.settings.refreshInterval).toBe(90)
      expect(state.settings.notifications).toBe(false)
      expect(state.settings.language).toBe('de')
      expect(state.settings.lowQuotaThreshold).toBe(10) // unchanged
    })
  })
})
