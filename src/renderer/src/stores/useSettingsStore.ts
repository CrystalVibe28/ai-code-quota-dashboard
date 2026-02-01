import { create } from 'zustand'
import type { Settings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import i18n from '@/i18n'

interface SettingsState {
  settings: Settings
  isLoading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (settings: Partial<Settings>) => Promise<boolean>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.api.storage.getSettings()
      const finalSettings = settings || DEFAULT_SETTINGS
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
