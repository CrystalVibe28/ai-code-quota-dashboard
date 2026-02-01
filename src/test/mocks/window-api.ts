import { vi } from 'vitest'

// Mock for window.api (Electron IPC bridge)
export const mockWindowApi = {
  auth: {
    hasPassword: vi.fn().mockResolvedValue(false),
    isPasswordSkipped: vi.fn().mockResolvedValue(false),
    verifyPassword: vi.fn().mockResolvedValue(true),
    setPassword: vi.fn().mockResolvedValue(true),
    skipPassword: vi.fn().mockResolvedValue(true),
    lock: vi.fn().mockResolvedValue(undefined)
  },
  storage: {
    getAccounts: vi.fn().mockResolvedValue([]),
    saveAccount: vi.fn().mockResolvedValue(true),
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
    logout: vi.fn().mockResolvedValue(true),
    getUsage: vi.fn().mockResolvedValue(null),
    refreshToken: vi.fn().mockResolvedValue(true)
  },
  githubCopilot: {
    getAccounts: vi.fn().mockResolvedValue([]),
    login: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn().mockResolvedValue(true),
    getUsage: vi.fn().mockResolvedValue(null)
  },
  zaiCoding: {
    getAccounts: vi.fn().mockResolvedValue([]),
    addAccount: vi.fn().mockResolvedValue({ success: true }),
    removeAccount: vi.fn().mockResolvedValue(true),
    getUsage: vi.fn().mockResolvedValue(null)
  },
  app: {
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false)
  },
  notification: {
    resetState: vi.fn().mockResolvedValue(undefined)
  }
}

// Helper to reset all mocks
export function resetWindowApiMocks(): void {
  Object.values(mockWindowApi).forEach((namespace) => {
    Object.values(namespace).forEach((mock) => {
      if (typeof mock === 'function' && 'mockClear' in mock) {
        mock.mockClear()
      }
    })
  })
}
