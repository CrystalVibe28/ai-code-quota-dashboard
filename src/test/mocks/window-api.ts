import { vi } from 'vitest'
import type { Mock } from 'vitest'

// Mock for window.api (Electron IPC bridge)
export const mockWindowApi: Record<string, Record<string, Mock>> = {
  auth: {
    hasPassword: vi.fn().mockResolvedValue(false),
    isPasswordSkipped: vi.fn().mockResolvedValue(false),
    verifyPassword: vi.fn().mockResolvedValue(true),
    setPassword: vi.fn().mockResolvedValue(true),
    skipPassword: vi.fn().mockResolvedValue(true),
    lock: vi.fn().mockResolvedValue(undefined),
    clearAllData: vi.fn().mockResolvedValue(undefined),
    unlockWithSkippedPassword: vi.fn().mockResolvedValue(true),
    changePassword: vi.fn().mockResolvedValue(true),
    removePassword: vi.fn().mockResolvedValue(true),
    setPasswordFromSettings: vi.fn().mockResolvedValue(true)
  },
  storage: {
    getAccounts: vi.fn().mockResolvedValue([]),
    saveAccount: vi.fn().mockResolvedValue(true),
    deleteAccount: vi.fn().mockResolvedValue(true),
    removeAccount: vi.fn().mockResolvedValue(true),
    updateAccount: vi.fn().mockResolvedValue(true),
    getSettings: vi.fn().mockResolvedValue({
      refreshInterval: 60,
      lowQuotaThreshold: 10,
      notifications: true,
      language: 'en',
      closeToTray: false,
      notificationReminderInterval: 0
    }),
    saveSettings: vi.fn().mockResolvedValue(true),
    getCustomization: vi.fn().mockResolvedValue(null),
    saveCustomization: vi.fn().mockResolvedValue(true)
  },
  antigravity: {
    getAccounts: vi.fn().mockResolvedValue([]),
    login: vi.fn().mockResolvedValue({ success: true }),
    cancelLogin: vi.fn().mockResolvedValue(true),
    logout: vi.fn().mockResolvedValue(true),
    getUsage: vi.fn().mockResolvedValue(null),
    refreshToken: vi.fn().mockResolvedValue(true),
    fetchUsage: vi.fn().mockResolvedValue(null),
    fetchAllUsage: vi.fn().mockResolvedValue([])
  },
  githubCopilot: {
    getAccounts: vi.fn().mockResolvedValue([]),
    login: vi.fn().mockResolvedValue({ success: true }),
    cancelLogin: vi.fn().mockResolvedValue(true),
    logout: vi.fn().mockResolvedValue(true),
    getUsage: vi.fn().mockResolvedValue(null),
    refreshToken: vi.fn().mockResolvedValue(true),
    fetchUsage: vi.fn().mockResolvedValue(null),
    fetchAllUsage: vi.fn().mockResolvedValue([])
  },
  zaiCoding: {
    getAccounts: vi.fn().mockResolvedValue([]),
    addAccount: vi.fn().mockResolvedValue({ success: true }),
    removeAccount: vi.fn().mockResolvedValue(true),
    getUsage: vi.fn().mockResolvedValue(null),
    validateApiKey: vi.fn().mockResolvedValue({ valid: true }),
    fetchUsage: vi.fn().mockResolvedValue(null),
    fetchAllUsage: vi.fn().mockResolvedValue([])
  },
  codex: {
    login: vi.fn().mockResolvedValue({ success: true }),
    cancelLogin: vi.fn().mockResolvedValue(true),
    refreshToken: vi.fn().mockResolvedValue(true),
    fetchUsage: vi.fn().mockResolvedValue(null),
    fetchAllUsage: vi.fn().mockResolvedValue([])
  },
  opencodeGo: {
    login: vi.fn().mockResolvedValue({ success: true }),
    cancelLogin: vi.fn().mockResolvedValue(true),
    refreshToken: vi.fn().mockResolvedValue(true),
    fetchUsage: vi.fn().mockResolvedValue(null),
    fetchAllUsage: vi.fn().mockResolvedValue([])
  },
  app: {
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false)
  },
  notification: {
    resetState: vi.fn().mockResolvedValue(undefined),
    restartTimer: vi.fn().mockResolvedValue(true),
    checkAndNotify: vi.fn().mockResolvedValue(true)
  }
}
