import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AntigravityAccount,
  CodexAccount,
  GithubCopilotAccount,
  OpencodeGoAccount,
  ZaiCodingAccount,
  AiStudioAccount,
  AiStudioLoginSession,
  AiStudioAccountUsage,
  LoginResult,
  AntigravityUsage,
  CodexAccountUsage,
  GithubCopilotAccountUsage,
  OpencodeGoAccountUsage,
  ZaiAccountUsage,
  Settings,
  CustomizationState
} from '@shared/types'
import type { UpdateInfo, UpdateCheckResult, UpdateDownloadStatus } from '@shared/types/update'

interface AuthAPI {
  hasPassword: () => Promise<boolean>
  verifyPassword: (password: string) => Promise<boolean>
  setPassword: (password: string) => Promise<boolean>
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
  lock: () => Promise<void>
  clearAllData: () => Promise<void>
  skipPassword: () => Promise<boolean>
  isPasswordSkipped: () => Promise<boolean>
  unlockWithSkippedPassword: () => Promise<boolean>
  removePassword: (password: string) => Promise<boolean>
  setPasswordFromSettings: (password: string) => Promise<boolean>
}

interface StorageAPI {
  getAccounts: <T extends AntigravityAccount | GithubCopilotAccount | ZaiCodingAccount | CodexAccount | OpencodeGoAccount | AiStudioAccount>(
    provider: string
  ) => Promise<T[]>
  saveAccount: <T extends AntigravityAccount | GithubCopilotAccount | ZaiCodingAccount | CodexAccount | OpencodeGoAccount | AiStudioAccount>(
    provider: string,
    account: T
  ) => Promise<boolean>
  deleteAccount: (provider: string, accountId: string) => Promise<boolean>
  updateAccount: (
    provider: string,
    accountId: string,
    data: Partial<AntigravityAccount> | Partial<GithubCopilotAccount> | Partial<ZaiCodingAccount> | Partial<CodexAccount> | Partial<OpencodeGoAccount> | Partial<AiStudioAccount>
  ) => Promise<boolean>
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Partial<Settings>) => Promise<boolean>
  getCustomization: () => Promise<Partial<CustomizationState> | null>
  saveCustomization: (data: CustomizationState) => Promise<boolean>
}

interface AntigravityAPI {
  login: () => Promise<LoginResult<AntigravityAccount>>
  cancelLogin: () => Promise<boolean>
  refreshToken: (accountId: string) => Promise<boolean>
  fetchUsage: (accountId: string) => Promise<AntigravityUsage | null>
  fetchAllUsage: () => Promise<AntigravityUsage[]>
}

interface GithubCopilotAPI {
  login: () => Promise<LoginResult<GithubCopilotAccount>>
  cancelLogin: () => Promise<boolean>
  refreshToken: (accountId: string) => Promise<boolean>
  fetchUsage: (accountId: string) => Promise<GithubCopilotAccountUsage | null>
  fetchAllUsage: () => Promise<GithubCopilotAccountUsage[]>
}

interface CodexAPI {
  login: () => Promise<LoginResult<CodexAccount>>
  cancelLogin: () => Promise<boolean>
  refreshToken: (accountId: string) => Promise<boolean>
  fetchUsage: (accountId: string) => Promise<CodexAccountUsage | null>
  fetchAllUsage: () => Promise<CodexAccountUsage[]>
}

interface OpencodeGoAPI {
  login: () => Promise<LoginResult<OpencodeGoAccount>>
  cancelLogin: () => Promise<boolean>
  refreshToken: (accountId: string) => Promise<boolean>
  fetchUsage: (accountId: string) => Promise<OpencodeGoAccountUsage | null>
  fetchAllUsage: () => Promise<OpencodeGoAccountUsage[]>
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
    codex: unknown[]
    opencodeGo?: unknown[]
  }) => Promise<boolean>
}

interface UpdateAPI {
  check: () => Promise<UpdateCheckResult>
  getCurrentVersion: () => Promise<string>
  getSkippedVersion: () => Promise<string | undefined>
  skipVersion: (version: string) => Promise<boolean>
  clearSkippedVersion: () => Promise<boolean>
  getLastChecked: () => Promise<string | undefined>
  getLastUpdateInfo: () => Promise<UpdateInfo | null>
  getStatus: () => Promise<UpdateDownloadStatus>
  install: () => Promise<boolean>
  openReleasePage: (url?: string) => Promise<boolean>
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
  onStatusChange: (callback: (status: UpdateDownloadStatus) => void) => () => void
}

interface AiStudioAPI {
  hasOAuthCredentials: () => Promise<boolean>
  saveOAuthCredentials: (clientId: string, clientSecret: string) => Promise<boolean>
  deleteOAuthCredentials: () => Promise<boolean>
  login: () => Promise<{ success: boolean; account?: AiStudioLoginSession; error?: string }>
  cancelLogin: () => Promise<boolean>
  refreshToken: (accountId: string) => Promise<boolean>
  fetchUsage: (accountId: string) => Promise<AiStudioAccountUsage['usage']>
  fetchAllUsage: () => Promise<AiStudioAccountUsage[]>
}

interface CustomAPI {
  auth: AuthAPI
  storage: StorageAPI
  antigravity: AntigravityAPI
  githubCopilot: GithubCopilotAPI
  zaiCoding: ZaiCodingAPI
  aiStudio: AiStudioAPI
  codex: CodexAPI
  opencodeGo: OpencodeGoAPI
  app: AppAPI
  notification: NotificationAPI
  update: UpdateAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
