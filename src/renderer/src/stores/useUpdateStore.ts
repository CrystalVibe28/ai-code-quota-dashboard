import { create } from 'zustand'
import type { UpdateDownloadState, UpdateInfo } from '@shared/types/update'

interface UpdateState {
  // State
  currentVersion: string
  latestVersion: string | null
  hasUpdate: boolean
  releaseUrl: string | null
  releaseNotes: string | null
  publishedAt: string | null
  isChecking: boolean
  downloadState: UpdateDownloadState
  downloadProgress: number
  lastChecked: string | null
  skippedVersion: string | null
  error: string | null

  // Actions
  checkForUpdate: () => Promise<void>
  skipVersion: (version: string) => Promise<void>
  clearSkippedVersion: () => Promise<void>
  openReleasePage: () => Promise<void>
  startUpdate: () => Promise<void>
  initialize: () => () => void
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
  downloadState: 'idle',
  downloadProgress: 0,
  lastChecked: null,
  skippedVersion: null,
  error: null,

  checkForUpdate: async () => {
    set({ isChecking: true, error: null })
    try {
      const result = await window.api.update.check()
      if (result.success && result.data) {
        const data = result.data
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

  startUpdate: async () => {
    set({ error: null })
    try {
      const success = await window.api.update.install()
      if (!success) {
        set({ error: 'Update is not ready to install' })
      }
    } catch (error) {
      set({ error: String(error) })
    }
  },

  initialize: () => {
    let receivedAvailable = false
    let receivedStatus = false

    const cleanupAvailable = window.api.update.onUpdateAvailable((info) => {
      receivedAvailable = true
      get().setUpdateInfo(info)
    })

    const cleanupStatus = window.api.update.onStatusChange((status) => {
      receivedStatus = true
      set((state) => ({
        downloadState: status.state,
        downloadProgress: status.percent,
        latestVersion: status.version || state.latestVersion,
        hasUpdate: status.state === 'idle' ? false : status.version ? true : state.hasUpdate,
        error: status.error || null
      }))
    })

    Promise.all([
      window.api.update.getCurrentVersion(),
      window.api.update.getSkippedVersion(),
      window.api.update.getLastChecked(),
      window.api.update.getLastUpdateInfo(),
      window.api.update.getStatus()
    ]).then(([currentVersion, skippedVersion, lastChecked, info, status]) => {
      set((state) => ({
        currentVersion,
        latestVersion: receivedAvailable || receivedStatus
          ? state.latestVersion
          : info?.latestVersion || status.version || null,
        hasUpdate: receivedAvailable || receivedStatus
          ? state.hasUpdate
          : info?.hasUpdate || Boolean(status.version && status.state !== 'idle'),
        releaseUrl: receivedAvailable ? state.releaseUrl : info?.releaseUrl || null,
        releaseNotes: receivedAvailable ? state.releaseNotes : info?.releaseNotes || null,
        publishedAt: receivedAvailable ? state.publishedAt : info?.publishedAt || null,
        downloadState: receivedStatus ? state.downloadState : status.state,
        downloadProgress: receivedStatus ? state.downloadProgress : status.percent,
        lastChecked: lastChecked || null,
        skippedVersion: skippedVersion || null,
        error: receivedStatus ? state.error : status.error || null
      }))
    }).catch((error) => {
      set({ error: String(error) })
    })

    return () => {
      cleanupAvailable()
      cleanupStatus()
    }
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
