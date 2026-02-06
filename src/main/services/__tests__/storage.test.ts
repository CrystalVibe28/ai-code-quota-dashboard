import { describe, it, expect, vi, beforeEach } from 'vitest'

// Test the data migration logic without Electron/fs dependencies
// Extracted migrateData logic for isolated testing

const CURRENT_DATA_VERSION = 2

interface StorageData {
  _version?: number
  antigravity: any[]
  githubCopilot: any[]
  zaiCoding: any[]
  settings: any
  customization?: any
}

const DEFAULT_DATA: StorageData = {
  antigravity: [],
  githubCopilot: [],
  zaiCoding: [],
  settings: {
    refreshInterval: 60,
    lowQuotaThreshold: 10,
    notifications: true,
    language: 'en',
    closeToTray: false,
    notificationReminderInterval: 0
  }
}

// Pure migration function extracted from StorageService
function migrateData(data: StorageData): StorageData {
  const version = data._version || 1

  if (version < 2) {
    // Migration v1 -> v2: Add displayName field to all accounts
    if (data.antigravity) {
      data.antigravity = data.antigravity.map((acc) => ({
        ...acc,
        displayName: acc.displayName || acc.name || acc.email
      }))
    }

    if (data.githubCopilot) {
      data.githubCopilot = data.githubCopilot.map((acc) => ({
        ...acc,
        displayName: acc.displayName || acc.name || acc.login
      }))
    }

    if (data.zaiCoding) {
      data.zaiCoding = data.zaiCoding.map((acc) => ({
        ...acc,
        displayName: acc.displayName || acc.name
      }))
    }

    data._version = 2
  }

  return data
}

/**
 * Pure function extracted from StorageService for testing
 * Maps system locale to supported language code
 */
function mapLocaleToLanguage(locale: string): string {
  const lowerLocale = locale.toLowerCase()

  // Traditional Chinese variants
  if (lowerLocale === 'zh-tw' || lowerLocale === 'zh-hant') {
    return 'zh-TW'
  }

  // Simplified Chinese variants
  if (lowerLocale === 'zh-cn' || lowerLocale === 'zh-hans' || lowerLocale === 'zh') {
    return 'zh-CN'
  }

  // Default to English for all other locales
  return 'en'
}

describe('StorageService data migration', () => {
  describe('migrateData v1 -> v2', () => {
    it('should add displayName to antigravity accounts from email', () => {
      const v1Data: StorageData = {
        _version: 1,
        antigravity: [
          { id: '1', email: 'user@example.com', name: '' }
        ],
        githubCopilot: [],
        zaiCoding: [],
        settings: DEFAULT_DATA.settings
      }

      const migrated = migrateData(v1Data)

      expect(migrated._version).toBe(2)
      expect(migrated.antigravity[0].displayName).toBe('user@example.com')
    })

    it('should add displayName to antigravity accounts from name', () => {
      const v1Data: StorageData = {
        _version: 1,
        antigravity: [
          { id: '1', email: 'user@example.com', name: 'John Doe' }
        ],
        githubCopilot: [],
        zaiCoding: [],
        settings: DEFAULT_DATA.settings
      }

      const migrated = migrateData(v1Data)

      expect(migrated.antigravity[0].displayName).toBe('John Doe')
    })

    it('should add displayName to githubCopilot accounts from login', () => {
      const v1Data: StorageData = {
        _version: 1,
        antigravity: [],
        githubCopilot: [
          { id: '1', login: 'octocat', name: '' }
        ],
        zaiCoding: [],
        settings: DEFAULT_DATA.settings
      }

      const migrated = migrateData(v1Data)

      expect(migrated._version).toBe(2)
      expect(migrated.githubCopilot[0].displayName).toBe('octocat')
    })

    it('should add displayName to githubCopilot accounts from name', () => {
      const v1Data: StorageData = {
        _version: 1,
        antigravity: [],
        githubCopilot: [
          { id: '1', login: 'octocat', name: 'The Octocat' }
        ],
        zaiCoding: [],
        settings: DEFAULT_DATA.settings
      }

      const migrated = migrateData(v1Data)

      expect(migrated.githubCopilot[0].displayName).toBe('The Octocat')
    })

    it('should add displayName to zaiCoding accounts from name', () => {
      const v1Data: StorageData = {
        _version: 1,
        antigravity: [],
        githubCopilot: [],
        zaiCoding: [
          { id: '1', name: 'My Zai Coding Plan Account' }
        ],
        settings: DEFAULT_DATA.settings
      }

      const migrated = migrateData(v1Data)

      expect(migrated._version).toBe(2)
      expect(migrated.zaiCoding[0].displayName).toBe('My Zai Coding Plan Account')
    })

    it('should preserve existing displayName if present', () => {
      const v1Data: StorageData = {
        _version: 1,
        antigravity: [
          { id: '1', email: 'user@example.com', name: 'John', displayName: 'Custom Name' }
        ],
        githubCopilot: [],
        zaiCoding: [],
        settings: DEFAULT_DATA.settings
      }

      const migrated = migrateData(v1Data)

      expect(migrated.antigravity[0].displayName).toBe('Custom Name')
    })

    it('should handle empty account arrays', () => {
      const v1Data: StorageData = {
        _version: 1,
        antigravity: [],
        githubCopilot: [],
        zaiCoding: [],
        settings: DEFAULT_DATA.settings
      }

      const migrated = migrateData(v1Data)

      expect(migrated._version).toBe(2)
      expect(migrated.antigravity).toEqual([])
      expect(migrated.githubCopilot).toEqual([])
      expect(migrated.zaiCoding).toEqual([])
    })

    it('should handle data without version (assume v1)', () => {
      const noVersionData: StorageData = {
        antigravity: [
          { id: '1', email: 'test@test.com', name: 'Test' }
        ],
        githubCopilot: [],
        zaiCoding: [],
        settings: DEFAULT_DATA.settings
      }

      const migrated = migrateData(noVersionData)

      expect(migrated._version).toBe(2)
      expect(migrated.antigravity[0].displayName).toBe('Test')
    })

    it('should migrate multiple accounts in each provider', () => {
      const v1Data: StorageData = {
        _version: 1,
        antigravity: [
          { id: '1', email: 'user1@example.com', name: 'User 1' },
          { id: '2', email: 'user2@example.com', name: '' }
        ],
        githubCopilot: [
          { id: '3', login: 'user1', name: 'GitHub User 1' },
          { id: '4', login: 'user2', name: '' }
        ],
        zaiCoding: [
          { id: '5', name: 'Zai Coding Plan 1' },
          { id: '6', name: 'Zai Coding Plan 2' }
        ],
        settings: DEFAULT_DATA.settings
      }

      const migrated = migrateData(v1Data)

      expect(migrated._version).toBe(2)
      expect(migrated.antigravity[0].displayName).toBe('User 1')
      expect(migrated.antigravity[1].displayName).toBe('user2@example.com')
      expect(migrated.githubCopilot[0].displayName).toBe('GitHub User 1')
      expect(migrated.githubCopilot[1].displayName).toBe('user2')
      expect(migrated.zaiCoding[0].displayName).toBe('Zai Coding Plan 1')
      expect(migrated.zaiCoding[1].displayName).toBe('Zai Coding Plan 2')
    })
  })

  describe('migrateData v2 (current version)', () => {
    it('should not modify v2 data', () => {
      const v2Data: StorageData = {
        _version: 2,
        antigravity: [
          { id: '1', email: 'user@example.com', name: 'User', displayName: 'My Display Name' }
        ],
        githubCopilot: [],
        zaiCoding: [],
        settings: DEFAULT_DATA.settings
      }

      const migrated = migrateData(v2Data)

      expect(migrated._version).toBe(2)
      expect(migrated.antigravity[0].displayName).toBe('My Display Name')
    })

    it('should preserve all existing data in v2', () => {
      const v2Data: StorageData = {
        _version: 2,
        antigravity: [
          {
            id: '1',
            email: 'user@example.com',
            name: 'User',
            displayName: 'Display',
            accessToken: 'token123',
            refreshToken: 'refresh123',
            expiresAt: 1234567890,
            projectId: 'proj1',
            showInOverview: true,
            selectedModels: ['model1', 'model2']
          }
        ],
        githubCopilot: [],
        zaiCoding: [],
        settings: {
          refreshInterval: 120,
          lowQuotaThreshold: 20,
          notifications: false,
          language: 'zh-TW',
          closeToTray: true,
          notificationReminderInterval: 60
        },
        customization: {
          global: { theme: 'dark' },
          providers: {},
          cards: {}
        }
      }

      const migrated = migrateData(v2Data)

      expect(migrated).toEqual(v2Data)
    })
  })

  describe('DEFAULT_DATA', () => {
    it('should have correct default settings', () => {
      expect(DEFAULT_DATA.settings).toEqual({
        refreshInterval: 60,
        lowQuotaThreshold: 10,
        notifications: true,
        language: 'en',
        closeToTray: false,
        notificationReminderInterval: 0
      })
    })

    it('should have empty account arrays', () => {
      expect(DEFAULT_DATA.antigravity).toEqual([])
      expect(DEFAULT_DATA.githubCopilot).toEqual([])
      expect(DEFAULT_DATA.zaiCoding).toEqual([])
    })
  })

  describe('mapLocaleToLanguage', () => {
    it('should return zh-TW for zh-TW locale', () => {
      expect(mapLocaleToLanguage('zh-TW')).toBe('zh-TW')
      expect(mapLocaleToLanguage('zh-tw')).toBe('zh-TW')
    })

    it('should return zh-TW for zh-Hant locale', () => {
      expect(mapLocaleToLanguage('zh-Hant')).toBe('zh-TW')
      expect(mapLocaleToLanguage('zh-hant')).toBe('zh-TW')
    })

    it('should return zh-CN for zh-CN locale', () => {
      expect(mapLocaleToLanguage('zh-CN')).toBe('zh-CN')
      expect(mapLocaleToLanguage('zh-cn')).toBe('zh-CN')
    })

    it('should return zh-CN for zh-Hans locale', () => {
      expect(mapLocaleToLanguage('zh-Hans')).toBe('zh-CN')
      expect(mapLocaleToLanguage('zh-hans')).toBe('zh-CN')
    })

    it('should return zh-CN for generic zh locale', () => {
      expect(mapLocaleToLanguage('zh')).toBe('zh-CN')
    })

    it('should return en for English locales', () => {
      expect(mapLocaleToLanguage('en')).toBe('en')
      expect(mapLocaleToLanguage('en-US')).toBe('en')
      expect(mapLocaleToLanguage('en-GB')).toBe('en')
    })

    it('should return en for unsupported locales', () => {
      expect(mapLocaleToLanguage('ja')).toBe('en')
      expect(mapLocaleToLanguage('ko')).toBe('en')
      expect(mapLocaleToLanguage('de')).toBe('en')
      expect(mapLocaleToLanguage('fr')).toBe('en')
    })
  })
})

describe('StorageService account operations (pure logic)', () => {
  // Test the pure logic of account operations

  describe('saveAccount logic', () => {
    it('should add new account when id does not exist', () => {
      const accounts: any[] = []
      const newAccount = { id: '1', name: 'Test' }

      const existingIdx = accounts.findIndex((a) => a.id === newAccount.id)
      if (existingIdx >= 0) {
        accounts[existingIdx] = newAccount
      } else {
        accounts.push(newAccount)
      }

      expect(accounts).toHaveLength(1)
      expect(accounts[0]).toEqual(newAccount)
    })

    it('should update existing account when id exists', () => {
      const accounts = [{ id: '1', name: 'Old Name' }]
      const updatedAccount = { id: '1', name: 'New Name' }

      const existingIdx = accounts.findIndex((a) => a.id === updatedAccount.id)
      if (existingIdx >= 0) {
        accounts[existingIdx] = updatedAccount
      } else {
        accounts.push(updatedAccount)
      }

      expect(accounts).toHaveLength(1)
      expect(accounts[0].name).toBe('New Name')
    })
  })

  describe('deleteAccount logic', () => {
    it('should remove account by id', () => {
      const accounts = [
        { id: '1', name: 'Account 1' },
        { id: '2', name: 'Account 2' },
        { id: '3', name: 'Account 3' }
      ]

      const filtered = accounts.filter((a) => a.id !== '2')

      expect(filtered).toHaveLength(2)
      expect(filtered.map((a) => a.id)).toEqual(['1', '3'])
    })

    it('should return empty array when deleting only account', () => {
      const accounts = [{ id: '1', name: 'Only Account' }]
      const filtered = accounts.filter((a) => a.id !== '1')
      expect(filtered).toHaveLength(0)
    })

    it('should not modify array when id not found', () => {
      const accounts = [{ id: '1', name: 'Account 1' }]
      const filtered = accounts.filter((a) => a.id !== '999')
      expect(filtered).toHaveLength(1)
    })
  })

  describe('updateAccount logic', () => {
    it('should merge updates into existing account', () => {
      const accounts = [
        { id: '1', name: 'Old Name', email: 'old@example.com', extra: 'keep' }
      ]

      const idx = accounts.findIndex((a) => a.id === '1')
      if (idx >= 0) {
        accounts[idx] = { ...accounts[idx], name: 'New Name' }
      }

      expect(accounts[0]).toEqual({
        id: '1',
        name: 'New Name',
        email: 'old@example.com',
        extra: 'keep'
      })
    })

    it('should handle partial updates', () => {
      const account = { id: '1', a: 1, b: 2, c: 3 }
      const updates = { b: 20 }
      const merged = { ...account, ...updates }

      expect(merged).toEqual({ id: '1', a: 1, b: 20, c: 3 })
    })
  })

  describe('saveSettings logic', () => {
    it('should merge settings updates', () => {
      const currentSettings = {
        refreshInterval: 60,
        lowQuotaThreshold: 10,
        notifications: true,
        language: 'en'
      }
      const updates = { refreshInterval: 120, language: 'zh-TW' }
      const merged = { ...currentSettings, ...updates }

      expect(merged).toEqual({
        refreshInterval: 120,
        lowQuotaThreshold: 10,
        notifications: true,
        language: 'zh-TW'
      })
    })
  })
})
