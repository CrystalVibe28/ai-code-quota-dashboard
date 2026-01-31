import { create } from 'zustand'
import i18n from '@/i18n'

interface Settings {
  refreshInterval: number
  lowQuotaThreshold: number
  notifications: boolean
  language: string
  closeToTray: boolean
  notificationReminderInterval: number
}

interface SettingsState {
  settings: Settings
  isLoading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (settings: Partial<Settings>) => Promise<boolean>
}

const DEFAULT_SETTINGS: Settings = {
  refreshInterval: 60,
  lowQuotaThreshold: 10,
  notifications: true,
  language: 'en',
  closeToTray: false,
  notificationReminderInterval: 0
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.api.storage.getSettings()
      const finalSettings = (settings as Settings) || DEFAULT_SETTINGS
      set({ settings: finalSettings, isLoading: false })

      // Sync language with i18next
      if (finalSettings.language && finalSettings.language !== i18n.language) {
        await i18n.changeLanguage(finalSettings.language)
      }
    } catch {
      set({ settings: DEFAULT_SETTINGS, isLoading: false })
    }
  },

  updateSettings: async (newSettings: Partial<Settings>) => {
    set((state) => ({ settings: { ...state.settings, ...newSettings } }))

    try {
      return await window.api.storage.saveSettings(newSettings)
    } catch {
      return false
    }
  }
}))
