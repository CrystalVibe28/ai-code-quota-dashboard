import { create } from 'zustand'
import type { UpdateInfo } from '@shared/types/update'

interface UpdateState {
  // State
  currentVersion: string
  latestVersion: string | null
  hasUpdate: boolean
  releaseUrl: string | null
  releaseNotes: string | null
  publishedAt: string | null
  isChecking: boolean
  lastChecked: string | null
  skippedVersion: string | null
  error: string | null

  // Actions
  checkForUpdate: () => Promise<void>
  skipVersion: (version: string) => Promise<void>
  clearSkippedVersion: () => Promise<void>
  openReleasePage: () => Promise<void>
  initialize: () => void
  setUpdateInfo: (info: UpdateInfo) => void
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  // Initial state
  currentVersion: '',
  latestVersion: null,
  hasUpdate: false,
  releaseUrl: null,
  releaseNotes: null,
  publishedAt: null,
  isChecking: false,
  lastChecked: null,
  skippedVersion: null,
  error: null,

  checkForUpdate: async () => {
    set({ isChecking: true, error: null })
    try {
      const result = await window.api.update.check()
      if (result.success && result.data) {
        const data = result.data as UpdateInfo
        set({
          currentVersion: data.currentVersion,
          latestVersion: data.latestVersion,
          hasUpdate: data.hasUpdate,
          releaseUrl: data.releaseUrl,
          releaseNotes: data.releaseNotes || null,
          publishedAt: data.publishedAt || null,
          lastChecked: new Date().toISOString(),
          isChecking: false
        })
      } else {
        set({
          error: result.error || 'Unknown error',
          isChecking: false
        })
      }
    } catch (error) {
      set({
        error: String(error),
        isChecking: false
      })
    }
  },

  skipVersion: async (version: string) => {
    try {
      const success = await window.api.update.skipVersion(version)
      if (success) {
        set({ skippedVersion: version })
      }
    } catch (error) {
      console.error('[useUpdateStore] Failed to skip version:', error)
    }
  },

  clearSkippedVersion: async () => {
    try {
      const success = await window.api.update.clearSkippedVersion()
      if (success) {
        set({ skippedVersion: null })
      }
    } catch (error) {
      console.error('[useUpdateStore] Failed to clear skipped version:', error)
    }
  },

  openReleasePage: async () => {
    try {
      const { releaseUrl } = get()
      await window.api.update.openReleasePage(releaseUrl || undefined)
    } catch (error) {
      console.error('[useUpdateStore] Failed to open release page:', error)
    }
  },

  initialize: () => {
    // Get current version
    window.api.update.getCurrentVersion().then((version) => {
      set({ currentVersion: version })
    })

    // Get skipped version
    window.api.update.getSkippedVersion().then((version) => {
      set({ skippedVersion: version || null })
    })

    // Get last checked time
    window.api.update.getLastChecked().then((time) => {
      set({ lastChecked: time || null })
    })

    // Listen for update available notifications from main process
    const cleanup = window.api.update.onUpdateAvailable((info) => {
      const data = info as UpdateInfo
      get().setUpdateInfo(data)
    })

    // Return cleanup function (store cleanup on unmount)
    return cleanup
  },

  setUpdateInfo: (info: UpdateInfo) => {
    set({
      currentVersion: info.currentVersion,
      latestVersion: info.latestVersion,
      hasUpdate: info.hasUpdate,
      releaseUrl: info.releaseUrl,
      releaseNotes: info.releaseNotes || null,
      publishedAt: info.publishedAt || null,
      lastChecked: new Date().toISOString()
    })
  }
}))
