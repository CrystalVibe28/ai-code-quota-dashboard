import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { CryptoService } from './crypto'
import type {
  AntigravityAccount,
  GithubCopilotAccount,
  ZaiCodingAccount,
  Settings,
  CustomizationState
} from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'

interface StorageData {
  _version?: number
  antigravity: AntigravityAccount[]
  githubCopilot: GithubCopilotAccount[]
  zaiCoding: ZaiCodingAccount[]
  settings: Settings
  customization?: CustomizationState
}

// Data version for migrations
const CURRENT_DATA_VERSION = 2

const DEFAULT_DATA: StorageData = {
  antigravity: [],
  githubCopilot: [],
  zaiCoding: [],
  settings: DEFAULT_SETTINGS
}

export class StorageService {
  private static instance: StorageService
  private dataPath!: string
  private storagePath!: string
  private cryptoService!: CryptoService
  private password: string | null = null
  private cachedData: StorageData | null = null

  constructor() {
    if (StorageService.instance) {
      return StorageService.instance
    }

    this.dataPath = join(app.getPath('userData'), 'data')
    this.storagePath = join(this.dataPath, 'credentials.enc')
    this.cryptoService = new CryptoService()
    this.ensureDataDir()

    StorageService.instance = this
  }

  private ensureDataDir(): void {
    if (!existsSync(this.dataPath)) {
      mkdirSync(this.dataPath, { recursive: true })
    }
  }

  hasPassword(): boolean {
    return this.cryptoService.hasPassword()
  }

  unlock(password: string): void {
    this.password = password
    this.cachedData = this.loadData()
  }

  lock(): void {
    this.password = null
    this.cachedData = null
  }

  isUnlocked(): boolean {
    return this.password !== null
  }

  reEncrypt(oldPassword: string, newPassword: string): void {
    if (!this.cachedData) throw new Error('Storage is locked')

    this.password = newPassword
    try {
      this.saveData(this.cachedData)
    } catch (error) {
      this.password = oldPassword
      throw error
    }
  }

  /**
   * Maps system locale to supported language code
   * Supports: 'en', 'zh-TW', 'zh-CN'
   */
  private mapLocaleToLanguage(locale: string): string {
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

  private loadData(): StorageData {
    if (!this.password) throw new Error('Storage is locked')

    if (!existsSync(this.storagePath)) {
      // First installation: use system locale for initial language
      const systemLocale = app.getLocale()
      const initialLanguage = this.mapLocaleToLanguage(systemLocale)
      return {
        ...DEFAULT_DATA,
        _version: CURRENT_DATA_VERSION,
        settings: { ...DEFAULT_SETTINGS, language: initialLanguage }
      }
    }

    try {
      const encrypted = readFileSync(this.storagePath, 'utf-8')
      const decrypted = this.cryptoService.decrypt(encrypted, this.password)
      const data = JSON.parse(decrypted) as StorageData

      // Run migrations if needed
      const migratedData = this.migrateData(data)

      // Save if migration occurred
      if (migratedData._version !== data._version) {
        this.saveData(migratedData)
      }

      return migratedData
    } catch (error) {
      console.error('[Storage] Failed to load data:', error)
      return { ...DEFAULT_DATA, _version: CURRENT_DATA_VERSION }
    }
  }

  private migrateData(data: StorageData): StorageData {
    const version = data._version || 1

    if (version < 2) {
      console.log('[Storage] Migrating data from v1 to v2: Adding displayName field')

      // Migration v1 -> v2: Add displayName field to all accounts
      if (data.antigravity) {
        data.antigravity = data.antigravity.map(acc => ({
          ...acc,
          displayName: acc.displayName || acc.name || acc.email
        }))
      }

      if (data.githubCopilot) {
        data.githubCopilot = data.githubCopilot.map(acc => ({
          ...acc,
          displayName: acc.displayName || acc.name || acc.login
        }))
      }

      if (data.zaiCoding) {
        data.zaiCoding = data.zaiCoding.map(acc => ({
          ...acc,
          displayName: acc.displayName || acc.name
        }))
      }

      data._version = 2
    }

    // Future migrations can be added here:
    // if (version < 3) { ... }

    return data
  }

  private saveData(data: StorageData): void {
    if (!this.password) throw new Error('Storage is locked')

    const json = JSON.stringify(data, null, 2)
    const encrypted = this.cryptoService.encrypt(json, this.password)
    writeFileSync(this.storagePath, encrypted)
    this.cachedData = data
  }

  private getData(): StorageData {
    if (!this.cachedData) {
      this.cachedData = this.loadData()
    }
    return this.cachedData
  }

  async getAccounts(provider: string): Promise<AntigravityAccount[] | GithubCopilotAccount[] | ZaiCodingAccount[]> {
    const data = this.getData()
    switch (provider) {
      case 'antigravity':
        return data.antigravity
      case 'githubCopilot':
        return data.githubCopilot
      case 'zaiCoding':
        return data.zaiCoding
      default:
        return []
    }
  }

  async saveAccount(provider: string, account: AntigravityAccount | GithubCopilotAccount | ZaiCodingAccount): Promise<boolean> {
    const data = this.getData()

    switch (provider) {
      case 'antigravity': {
        const acc = account as AntigravityAccount
        const existingIdx = data.antigravity.findIndex(a => a.id === acc.id)
        if (existingIdx >= 0) {
          data.antigravity[existingIdx] = acc
        } else {
          data.antigravity.push(acc)
        }
        break
      }
      case 'githubCopilot': {
        const acc = account as GithubCopilotAccount
        const existingIdx = data.githubCopilot.findIndex(a => a.id === acc.id)
        if (existingIdx >= 0) {
          data.githubCopilot[existingIdx] = acc
        } else {
          data.githubCopilot.push(acc)
        }
        break
      }
      case 'zaiCoding': {
        const acc = account as ZaiCodingAccount
        const existingIdx = data.zaiCoding.findIndex(a => a.id === acc.id)
        if (existingIdx >= 0) {
          data.zaiCoding[existingIdx] = acc
        } else {
          data.zaiCoding.push(acc)
        }
        break
      }
      default:
        return false
    }

    this.saveData(data)
    return true
  }

  async deleteAccount(provider: string, accountId: string): Promise<boolean> {
    const data = this.getData()

    switch (provider) {
      case 'antigravity':
        data.antigravity = data.antigravity.filter(a => a.id !== accountId)
        break
      case 'githubCopilot':
        data.githubCopilot = data.githubCopilot.filter(a => a.id !== accountId)
        break
      case 'zaiCoding':
        data.zaiCoding = data.zaiCoding.filter(a => a.id !== accountId)
        break
      default:
        return false
    }

    this.saveData(data)
    return true
  }

  async updateAccount(
    provider: string,
    accountId: string,
    updates: Partial<AntigravityAccount> | Partial<GithubCopilotAccount> | Partial<ZaiCodingAccount>
  ): Promise<boolean> {
    const data = this.getData()

    switch (provider) {
      case 'antigravity': {
        const idx = data.antigravity.findIndex(a => a.id === accountId)
        if (idx >= 0) {
          data.antigravity[idx] = { ...data.antigravity[idx], ...updates as Partial<AntigravityAccount> }
        }
        break
      }
      case 'githubCopilot': {
        const idx = data.githubCopilot.findIndex(a => a.id === accountId)
        if (idx >= 0) {
          data.githubCopilot[idx] = { ...data.githubCopilot[idx], ...updates as Partial<GithubCopilotAccount> }
        }
        break
      }
      case 'zaiCoding': {
        const idx = data.zaiCoding.findIndex(a => a.id === accountId)
        if (idx >= 0) {
          data.zaiCoding[idx] = { ...data.zaiCoding[idx], ...updates as Partial<ZaiCodingAccount> }
        }
        break
      }
      default:
        return false
    }

    this.saveData(data)
    return true
  }

  async getSettings(): Promise<Settings> {
    const data = this.getData()
    return data.settings
  }

  async saveSettings(settings: Partial<Settings>): Promise<boolean> {
    const data = this.getData()
    data.settings = { ...data.settings, ...settings }
    this.saveData(data)
    return true
  }

  async getCustomization(): Promise<CustomizationState | null> {
    const data = this.getData()
    return data.customization || null
  }

  async saveCustomization(customization: CustomizationState): Promise<boolean> {
    const data = this.getData()
    data.customization = customization
    this.saveData(data)
    return true
  }
}
