import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
    skipPassword: (): Promise<boolean> => ipcRenderer.invoke('auth:skip-password'),
    isPasswordSkipped: (): Promise<boolean> => ipcRenderer.invoke('auth:is-password-skipped')
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
      ipcRenderer.invoke('app:start-background-refresh')
  },

  notification: {
    resetState: (): Promise<boolean> =>
      ipcRenderer.invoke('notification:reset-state'),
    restartTimer: (): Promise<boolean> =>
      ipcRenderer.invoke('notification:restart-timer')
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
