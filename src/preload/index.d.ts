import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AntigravityAccount,
  GithubCopilotAccount,
  ZaiCodingAccount,
  LoginResult,
  AntigravityUsage,
  GithubCopilotAccountUsage,
  ZaiAccountUsage,
  Settings,
  CustomizationState
} from '@shared/types'

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
  getAccounts: <T extends AntigravityAccount | GithubCopilotAccount | ZaiCodingAccount>(
    provider: string
  ) => Promise<T[]>
  saveAccount: <T extends AntigravityAccount | GithubCopilotAccount | ZaiCodingAccount>(
    provider: string,
    account: T
  ) => Promise<boolean>
  deleteAccount: (provider: string, accountId: string) => Promise<boolean>
  updateAccount: (
    provider: string,
    accountId: string,
    data: Partial<AntigravityAccount> | Partial<GithubCopilotAccount> | Partial<ZaiCodingAccount>
  ) => Promise<boolean>
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Partial<Settings>) => Promise<boolean>
  getCustomization: () => Promise<Partial<CustomizationState> | null>
  saveCustomization: (data: CustomizationState) => Promise<boolean>
}

interface AntigravityAPI {
  login: () => Promise<LoginResult<AntigravityAccount>>
  refreshToken: (accountId: string) => Promise<boolean>
  fetchUsage: (accountId: string) => Promise<AntigravityUsage | null>
  fetchAllUsage: () => Promise<AntigravityUsage[]>
}

interface GithubCopilotAPI {
  login: () => Promise<LoginResult<GithubCopilotAccount>>
  refreshToken: (accountId: string) => Promise<boolean>
  fetchUsage: (accountId: string) => Promise<GithubCopilotAccountUsage | null>
  fetchAllUsage: () => Promise<GithubCopilotAccountUsage[]>
}

interface ZaiCodingAPI {
  validateApiKey: (apiKey: string) => Promise<{ valid: boolean; error?: string }>
  fetchUsage: (accountId: string) => Promise<ZaiAccountUsage | null>
  fetchAllUsage: () => Promise<ZaiAccountUsage[]>
}

interface AppAPI {
  getCloseToTray: () => Promise<boolean>
  setCloseToTray: (value: boolean) => Promise<boolean>
  navigateToOverview: () => Promise<boolean>
  refreshAll: () => Promise<boolean>
  refreshIntervalChanged: () => Promise<boolean>
  stopBackgroundRefresh: () => Promise<boolean>
  startBackgroundRefresh: () => Promise<boolean>
  getPlatform: () => Promise<string>
  getAutoLaunch: () => Promise<boolean>
  setAutoLaunch: (enabled: boolean) => Promise<boolean>
}

interface NotificationAPI {
  resetState: () => Promise<boolean>
  restartTimer: () => Promise<boolean>
  checkAndNotify: (data: {
    antigravity: unknown[]
    copilot: unknown[]
    zai: unknown[]
  }) => Promise<boolean>
  triggerCheck: () => Promise<boolean>
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
