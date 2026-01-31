import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { CryptoService } from './crypto'

interface CustomizationData {
  global: Record<string, unknown>
  providers: Record<string, Record<string, unknown>>
  cards: Record<string, Record<string, unknown>>
}

interface StorageData {
  antigravity: AntigravityAccount[]
  githubCopilot: GithubCopilotAccount[]
  zaiCoding: ZaiCodingAccount[]
  settings: AppSettings
  customization?: CustomizationData
}

interface AntigravityAccount {
  id: string
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  projectId: string
  showInOverview: boolean
  selectedModels: string[]
}

interface GithubCopilotAccount {
  id: string
  login: string
  email: string
  name: string
  avatarUrl?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  showInOverview: boolean
  selectedQuotas: string[]
}

interface ZaiCodingAccount {
  id: string
  name: string
  apiKey: string
  showInOverview: boolean
  selectedLimits: string[]
}

interface AppSettings {
  refreshInterval: number
  lowQuotaThreshold: number
  notifications: boolean
  language: string
  closeToTray: boolean
  notificationReminderInterval: number
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

export class StorageService {
  private static instance: StorageService
  private dataPath: string
  private storagePath: string
  private cryptoService: CryptoService
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

  private loadData(): StorageData {
    if (!this.password) throw new Error('Storage is locked')
    
    if (!existsSync(this.storagePath)) {
      return { ...DEFAULT_DATA }
    }

    try {
      const encrypted = readFileSync(this.storagePath, 'utf-8')
      const decrypted = this.cryptoService.decrypt(encrypted, this.password)
      return JSON.parse(decrypted)
    } catch (error) {
      console.error('[Storage] Failed to load data:', error)
      return { ...DEFAULT_DATA }
    }
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

  async getAccounts(provider: string): Promise<unknown[]> {
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

  async saveAccount(provider: string, account: unknown): Promise<boolean> {
    const data = this.getData()
    const acc = account as any
    
    switch (provider) {
      case 'antigravity':
        const existingAnti = data.antigravity.findIndex(a => a.id === acc.id)
        if (existingAnti >= 0) {
          data.antigravity[existingAnti] = acc
        } else {
          data.antigravity.push(acc)
        }
        break
      case 'githubCopilot':
        const existingGh = data.githubCopilot.findIndex(a => a.id === acc.id)
        if (existingGh >= 0) {
          data.githubCopilot[existingGh] = acc
        } else {
          data.githubCopilot.push(acc)
        }
        break
      case 'zaiCoding':
        const existingZai = data.zaiCoding.findIndex(a => a.id === acc.id)
        if (existingZai >= 0) {
          data.zaiCoding[existingZai] = acc
        } else {
          data.zaiCoding.push(acc)
        }
        break
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

  async updateAccount(provider: string, accountId: string, updates: unknown): Promise<boolean> {
    const data = this.getData()
    const upd = updates as any
    
    switch (provider) {
      case 'antigravity':
        const antiIdx = data.antigravity.findIndex(a => a.id === accountId)
        if (antiIdx >= 0) {
          data.antigravity[antiIdx] = { ...data.antigravity[antiIdx], ...upd }
        }
        break
      case 'githubCopilot':
        const ghIdx = data.githubCopilot.findIndex(a => a.id === accountId)
        if (ghIdx >= 0) {
          data.githubCopilot[ghIdx] = { ...data.githubCopilot[ghIdx], ...upd }
        }
        break
      case 'zaiCoding':
        const zaiIdx = data.zaiCoding.findIndex(a => a.id === accountId)
        if (zaiIdx >= 0) {
          data.zaiCoding[zaiIdx] = { ...data.zaiCoding[zaiIdx], ...upd }
        }
        break
      default:
        return false
    }
    
    this.saveData(data)
    return true
  }

  async getSettings(): Promise<AppSettings> {
    const data = this.getData()
    return data.settings
  }

  async saveSettings(settings: unknown): Promise<boolean> {
    const data = this.getData()
    data.settings = { ...data.settings, ...(settings as AppSettings) }
    this.saveData(data)
    return true
  }

  async getCustomization(): Promise<CustomizationData | null> {
    const data = this.getData()
    return data.customization || null
  }

  async saveCustomization(customization: CustomizationData): Promise<boolean> {
    const data = this.getData()
    data.customization = customization
    this.saveData(data)
    return true
  }
}
