import { ElectronAPI } from '@electron-toolkit/preload'

interface AuthAPI {
  hasPassword: () => Promise<boolean>
  verifyPassword: (password: string) => Promise<boolean>
  setPassword: (password: string) => Promise<boolean>
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
  lock: () => Promise<void>
  skipPassword: () => Promise<boolean>
  isPasswordSkipped: () => Promise<boolean>
}

interface StorageAPI {
  getAccounts: (provider: string) => Promise<unknown[]>
  saveAccount: (provider: string, account: unknown) => Promise<boolean>
  deleteAccount: (provider: string, accountId: string) => Promise<boolean>
  updateAccount: (provider: string, accountId: string, data: unknown) => Promise<boolean>
  getSettings: () => Promise<unknown>
  saveSettings: (settings: unknown) => Promise<boolean>
  getCustomization: () => Promise<unknown>
  saveCustomization: (data: unknown) => Promise<boolean>
}

interface AntigravityAPI {
  login: () => Promise<{ success: boolean; account?: unknown; error?: string }>
  refreshToken: (accountId: string) => Promise<boolean>
  fetchUsage: (accountId: string) => Promise<unknown>
  fetchAllUsage: () => Promise<unknown[]>
}

interface GithubCopilotAPI {
  login: () => Promise<{ success: boolean; account?: unknown; error?: string }>
  refreshToken: (accountId: string) => Promise<boolean>
  fetchUsage: (accountId: string) => Promise<unknown>
  fetchAllUsage: () => Promise<unknown[]>
}

interface ZaiCodingAPI {
  validateApiKey: (apiKey: string) => Promise<{ valid: boolean; error?: string }>
  fetchUsage: (accountId: string) => Promise<unknown>
  fetchAllUsage: () => Promise<unknown[]>
}

interface AppAPI {
  getCloseToTray: () => Promise<boolean>
  setCloseToTray: (value: boolean) => Promise<boolean>
  navigateToOverview: () => Promise<boolean>
  refreshAll: () => Promise<boolean>
  refreshIntervalChanged: () => Promise<boolean>
  stopBackgroundRefresh: () => Promise<boolean>
  startBackgroundRefresh: () => Promise<boolean>
}

interface NotificationAPI {
  resetState: () => Promise<boolean>
  restartTimer: () => Promise<boolean>
}

interface CustomAPI {
  auth: AuthAPI
  storage: StorageAPI
  antigravity: AntigravityAPI
  githubCopilot: GithubCopilotAPI
  zaiCoding: ZaiCodingAPI
  app: AppAPI
  notification: NotificationAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
