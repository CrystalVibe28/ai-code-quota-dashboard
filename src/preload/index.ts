import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { UpdateCheckResult, UpdateDownloadStatus, UpdateInfo } from '@shared/types/update'

const api = {
  auth: {
    hasPassword: (): Promise<boolean> => ipcRenderer.invoke('auth:has-password'),
    verifyPassword: (password: string): Promise<boolean> =>
      ipcRenderer.invoke('auth:verify-password', password),
    setPassword: (password: string): Promise<boolean> =>
      ipcRenderer.invoke('auth:set-password', password),
    changePassword: (oldPassword: string, newPassword: string): Promise<boolean> =>
      ipcRenderer.invoke('auth:change-password', oldPassword, newPassword),
    lock: (): Promise<void> => ipcRenderer.invoke('auth:lock'),
    clearAllData: (): Promise<void> => ipcRenderer.invoke('auth:clear-all-data'),
    skipPassword: (): Promise<boolean> => ipcRenderer.invoke('auth:skip-password'),
    isPasswordSkipped: (): Promise<boolean> => ipcRenderer.invoke('auth:is-password-skipped'),
    unlockWithSkippedPassword: (): Promise<boolean> => ipcRenderer.invoke('auth:unlock-with-skipped-password'),
    removePassword: (password: string): Promise<boolean> =>
      ipcRenderer.invoke('auth:remove-password', password),
    setPasswordFromSettings: (password: string): Promise<boolean> =>
      ipcRenderer.invoke('auth:set-password-from-settings', password)
  },

  storage: {
    getAccounts: (provider: string): Promise<unknown[]> =>
      ipcRenderer.invoke('storage:get-accounts', provider),
    saveAccount: (provider: string, account: unknown): Promise<boolean> =>
      ipcRenderer.invoke('storage:save-account', provider, account),
    deleteAccount: (provider: string, accountId: string): Promise<boolean> =>
      ipcRenderer.invoke('storage:delete-account', provider, accountId),
    updateAccount: (provider: string, accountId: string, data: unknown): Promise<boolean> =>
      ipcRenderer.invoke('storage:update-account', provider, accountId, data),
    getSettings: (): Promise<unknown> =>
      ipcRenderer.invoke('storage:get-settings'),
    saveSettings: (settings: unknown): Promise<boolean> =>
      ipcRenderer.invoke('storage:save-settings', settings),
    getCustomization: (): Promise<unknown> =>
      ipcRenderer.invoke('storage:get-customization'),
    saveCustomization: (data: unknown): Promise<boolean> =>
      ipcRenderer.invoke('storage:save-customization', data)
  },

  antigravity: {
    login: (): Promise<{ success: boolean; account?: unknown; error?: string }> =>
      ipcRenderer.invoke('antigravity:login'),
    cancelLogin: (): Promise<boolean> =>
      ipcRenderer.invoke('antigravity:cancel-login'),
    refreshToken: (accountId: string): Promise<boolean> =>
      ipcRenderer.invoke('antigravity:refresh-token', accountId),
    fetchUsage: (accountId: string): Promise<unknown> =>
      ipcRenderer.invoke('antigravity:fetch-usage', accountId),
    fetchAllUsage: (): Promise<unknown[]> =>
      ipcRenderer.invoke('antigravity:fetch-all-usage')
  },

  githubCopilot: {
    login: (): Promise<{ success: boolean; account?: unknown; error?: string }> =>
      ipcRenderer.invoke('github-copilot:login'),
    cancelLogin: (): Promise<boolean> =>
      ipcRenderer.invoke('github-copilot:cancel-login'),
    refreshToken: (accountId: string): Promise<boolean> =>
      ipcRenderer.invoke('github-copilot:refresh-token', accountId),
    fetchUsage: (accountId: string): Promise<unknown> =>
      ipcRenderer.invoke('github-copilot:fetch-usage', accountId),
    fetchAllUsage: (): Promise<unknown[]> =>
      ipcRenderer.invoke('github-copilot:fetch-all-usage')
  },

  zaiCoding: {
    validateApiKey: (apiKey: string): Promise<{ valid: boolean; error?: string }> =>
      ipcRenderer.invoke('zai-coding:validate-api-key', apiKey),
    fetchUsage: (accountId: string): Promise<unknown> =>
      ipcRenderer.invoke('zai-coding:fetch-usage', accountId),
    fetchAllUsage: (): Promise<unknown[]> =>
      ipcRenderer.invoke('zai-coding:fetch-all-usage')
  },

  aiStudio: {
    hasOAuthCredentials: (): Promise<boolean> =>
      ipcRenderer.invoke('ai-studio:has-oauth-credentials'),
    saveOAuthCredentials: (clientId: string, clientSecret: string): Promise<boolean> =>
      ipcRenderer.invoke('ai-studio:save-oauth-credentials', clientId, clientSecret),
    deleteOAuthCredentials: (): Promise<boolean> =>
      ipcRenderer.invoke('ai-studio:delete-oauth-credentials'),
    login: (): Promise<{ success: boolean; account?: unknown; error?: string }> =>
      ipcRenderer.invoke('ai-studio:login'),
    cancelLogin: (): Promise<boolean> =>
      ipcRenderer.invoke('ai-studio:cancel-login'),
    refreshToken: (accountId: string): Promise<boolean> =>
      ipcRenderer.invoke('ai-studio:refresh-token', accountId),
    fetchUsage: (accountId: string): Promise<unknown> =>
      ipcRenderer.invoke('ai-studio:fetch-usage', accountId),
    fetchAllUsage: (): Promise<unknown[]> =>
      ipcRenderer.invoke('ai-studio:fetch-all-usage')
  },

  codex: {
    login: (): Promise<{ success: boolean; account?: unknown; error?: string }> =>
      ipcRenderer.invoke('codex:login'),
    cancelLogin: (): Promise<boolean> =>
      ipcRenderer.invoke('codex:cancel-login'),
    refreshToken: (accountId: string): Promise<boolean> =>
      ipcRenderer.invoke('codex:refresh-token', accountId),
    fetchUsage: (accountId: string): Promise<unknown> =>
      ipcRenderer.invoke('codex:fetch-usage', accountId),
    fetchAllUsage: (): Promise<unknown[]> =>
      ipcRenderer.invoke('codex:fetch-all-usage')
  },

  opencodeGo: {
    login: (): Promise<{ success: boolean; account?: unknown; error?: string }> =>
      ipcRenderer.invoke('opencode-go:login'),
    cancelLogin: (): Promise<boolean> =>
      ipcRenderer.invoke('opencode-go:cancel-login'),
    refreshToken: (accountId: string): Promise<boolean> =>
      ipcRenderer.invoke('opencode-go:refresh-token', accountId),
    fetchUsage: (accountId: string): Promise<unknown> =>
      ipcRenderer.invoke('opencode-go:fetch-usage', accountId),
    fetchAllUsage: (): Promise<unknown[]> =>
      ipcRenderer.invoke('opencode-go:fetch-all-usage')
  },

  app: {
    getCloseToTray: (): Promise<boolean> =>
      ipcRenderer.invoke('app:get-close-to-tray'),
    setCloseToTray: (value: boolean): Promise<boolean> =>
      ipcRenderer.invoke('app:set-close-to-tray', value),
    navigateToOverview: (): Promise<boolean> =>
      ipcRenderer.invoke('app:navigate-to-overview'),
    refreshAll: (): Promise<boolean> =>
      ipcRenderer.invoke('app:refresh-all'),
    refreshIntervalChanged: (): Promise<boolean> =>
      ipcRenderer.invoke('app:refresh-interval-changed'),
    stopBackgroundRefresh: (): Promise<boolean> =>
      ipcRenderer.invoke('app:stop-background-refresh'),
    startBackgroundRefresh: (): Promise<boolean> =>
      ipcRenderer.invoke('app:start-background-refresh'),
    getPlatform: (): Promise<string> =>
      ipcRenderer.invoke('app:get-platform'),
    getAutoLaunch: (): Promise<boolean> =>
      ipcRenderer.invoke('app:get-auto-launch'),
    setAutoLaunch: (enabled: boolean): Promise<boolean> =>
      ipcRenderer.invoke('app:set-auto-launch', enabled)
  },

  notification: {
    resetState: (): Promise<boolean> =>
      ipcRenderer.invoke('notification:reset-state'),
    restartTimer: (): Promise<boolean> =>
      ipcRenderer.invoke('notification:restart-timer'),
    checkAndNotify: (data: {
      antigravity: unknown[]
      copilot: unknown[]
      zai: unknown[]
      codex: unknown[]
      opencodeGo?: unknown[]
    }): Promise<boolean> =>
      ipcRenderer.invoke('notification:check-and-notify', data)
  },

  update: {
    check: (): Promise<UpdateCheckResult> =>
      ipcRenderer.invoke('update:check'),
    getCurrentVersion: (): Promise<string> =>
      ipcRenderer.invoke('update:get-current-version'),
    getSkippedVersion: (): Promise<string | undefined> =>
      ipcRenderer.invoke('update:get-skipped-version'),
    skipVersion: (version: string): Promise<boolean> =>
      ipcRenderer.invoke('update:skip-version', version),
    clearSkippedVersion: (): Promise<boolean> =>
      ipcRenderer.invoke('update:clear-skipped-version'),
    getLastChecked: (): Promise<string | undefined> =>
      ipcRenderer.invoke('update:get-last-checked'),
    getLastUpdateInfo: (): Promise<UpdateInfo | null> =>
      ipcRenderer.invoke('update:get-last-update-info'),
    getStatus: (): Promise<UpdateDownloadStatus> =>
      ipcRenderer.invoke('update:get-status'),
    install: (): Promise<boolean> =>
      ipcRenderer.invoke('update:install'),
    openReleasePage: (url?: string): Promise<boolean> =>
      ipcRenderer.invoke('update:open-release-page', url),
    onUpdateAvailable: (callback: (info: UpdateInfo) => void): (() => void) => {
      const handler = (_: unknown, info: UpdateInfo): void => callback(info)
      ipcRenderer.on('update:available', handler)
      return () => ipcRenderer.removeListener('update:available', handler)
    },
    onStatusChange: (callback: (status: UpdateDownloadStatus) => void): (() => void) => {
      const handler = (_: unknown, status: UpdateDownloadStatus): void => callback(status)
      ipcRenderer.on('update:status', handler)
      return () => ipcRenderer.removeListener('update:status', handler)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
