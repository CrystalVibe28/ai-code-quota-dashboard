import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { CryptoService } from './crypto'
import { atomicWriteFileSync, readFileWithBackupSync, replaceFileAtomicallySync } from './atomic-file'
import type {
  AntigravityAccount,
  GithubCopilotAccount,
  ZaiCodingAccount,
  CodexAccount,
  OpencodeGoAccount,
  OllamaCloudAccount,
  AiStudioAccount,
  Settings,
  CustomizationState
} from '@shared/types'
import {
  DEFAULT_SETTINGS,
  MAX_REFRESH_INTERVAL,
  MIN_REFRESH_INTERVAL
} from '@shared/types'

interface StorageData {
  _version?: number
  antigravity: AntigravityAccount[]
  githubCopilot: GithubCopilotAccount[]
  zaiCoding: ZaiCodingAccount[]
  codex: CodexAccount[]
  opencodeGo: OpencodeGoAccount[]
  ollamaCloud: OllamaCloudAccount[]
  aiStudio: AiStudioAccount[]
  aiStudioOAuth?: {
    clientId: string
    clientSecret: string
  }
  settings: Settings
  customization?: CustomizationState
}

const CURRENT_DATA_VERSION = 6

export class StorageVersionTooNewError extends Error {
  constructor(dataVersion: number) {
    super(`Storage data version ${dataVersion} is newer than supported version ${CURRENT_DATA_VERSION}`)
    this.name = 'StorageVersionTooNewError'
  }
}

const DEFAULT_DATA: StorageData = {
  antigravity: [],
  githubCopilot: [],
  zaiCoding: [],
  codex: [],
  opencodeGo: [],
  ollamaCloud: [],
  aiStudio: [],
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
    try {
      this.cachedData = this.loadData()
    } catch (error) {
      this.lock()
      throw error
    }
  }

  lock(): void {
    this.password = null
    this.cachedData = null
  }

  clearAllData(): void {
    this.lock()
    rmSync(this.dataPath, { recursive: true, force: true })
    this.ensureDataDir()
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

    if (!existsSync(this.storagePath) && !existsSync(`${this.storagePath}.bak`)) {
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
      let loadedVersion: number | undefined
      const migratedData = readFileWithBackupSync(
        this.storagePath,
        (encrypted) => {
          const decrypted = this.cryptoService.decrypt(encrypted, this.password!)
          const data = JSON.parse(decrypted) as StorageData
          loadedVersion = data._version
          const migrated = this.migrateData(data)
          this.validateData(migrated)
          return migrated
        },
        (error) => !(error instanceof StorageVersionTooNewError)
      )

      // Save if migration occurred
      if (migratedData._version !== loadedVersion) {
        this.saveData(migratedData)
      }

      return migratedData
    } catch (error) {
      if (error instanceof StorageVersionTooNewError) throw error
      console.error('[Storage] Failed to load data:', error)
      throw new Error('Failed to load storage data', { cause: error })
    }
  }

  private validateData(data: StorageData): void {
    if (typeof data?._version === 'number' && data._version > CURRENT_DATA_VERSION) {
      throw new StorageVersionTooNewError(data._version)
    }

    if (
      !data ||
      !Array.isArray(data.antigravity) ||
      !Array.isArray(data.githubCopilot) ||
      !Array.isArray(data.zaiCoding) ||
      !Array.isArray(data.codex) ||
      !Array.isArray(data.opencodeGo) ||
      !Array.isArray(data.ollamaCloud) ||
      !Array.isArray(data.aiStudio) ||
      (data.aiStudioOAuth !== undefined && (
        typeof data.aiStudioOAuth.clientId !== 'string' ||
        typeof data.aiStudioOAuth.clientSecret !== 'string'
      )) ||
      data._version !== CURRENT_DATA_VERSION ||
      !data.settings ||
      typeof data.settings !== 'object' ||
      Array.isArray(data.settings)
    ) {
      throw new Error('Invalid storage data')
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

    if (version < 3) {
      console.log('[Storage] Migrating data from v2 to v3: Adding codex provider')
      if (!data.codex) {
        data.codex = []
      }
      data._version = 3
    }

    if (version < 4) {
      console.log('[Storage] Migrating data from v3 to v4: Adding opencodeGo provider')
      if (!data.opencodeGo) {
        data.opencodeGo = []
      }
      data._version = 4
    }

    if (version < 5) {
      console.log('[Storage] Migrating data from v4 to v5: Adding aiStudio provider')
      if (!data.aiStudio) data.aiStudio = []
      data._version = 5
    }

    if (version < 6) {
      console.log('[Storage] Migrating data from v5 to v6: Adding ollamaCloud provider')
      if (!data.ollamaCloud) data.ollamaCloud = []
      data._version = 6
    }

    return data
  }

  private saveData(data: StorageData, syncBackup = false): void {
    if (!this.password) throw new Error('Storage is locked')

    const json = JSON.stringify(data, null, 2)
    const encrypted = this.cryptoService.encrypt(json, this.password)
    atomicWriteFileSync(this.storagePath, encrypted)
    if (syncBackup) replaceFileAtomicallySync(`${this.storagePath}.bak`, encrypted)
    this.cachedData = data
  }

  private getData(): StorageData {
    if (!this.cachedData) {
      this.cachedData = this.loadData()
    }
    return this.cachedData
  }

  async getAccounts(provider: string): Promise<AntigravityAccount[] | GithubCopilotAccount[] | ZaiCodingAccount[] | CodexAccount[] | OpencodeGoAccount[] | OllamaCloudAccount[] | AiStudioAccount[]> {
    const data = this.getData()
    switch (provider) {
      case 'antigravity':
        return data.antigravity
      case 'githubCopilot':
        return data.githubCopilot
      case 'zaiCoding':
        return data.zaiCoding
      case 'codex':
        return data.codex || []
      case 'opencodeGo':
        return data.opencodeGo || []
      case 'ollamaCloud':
        return data.ollamaCloud || []
      case 'aiStudio':
        return data.aiStudio || []
      default:
        return []
    }
  }

  async saveAccount(provider: string, account: AntigravityAccount | GithubCopilotAccount | ZaiCodingAccount | CodexAccount | OpencodeGoAccount | OllamaCloudAccount | AiStudioAccount): Promise<boolean> {
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
      case 'codex': {
        if (!data.codex) data.codex = []
        const acc = account as CodexAccount
        const existingIdx = data.codex.findIndex(a => a.id === acc.id)
        if (existingIdx >= 0) {
          data.codex[existingIdx] = acc
        } else {
          data.codex.push(acc)
        }
        break
      }
      case 'opencodeGo': {
        if (!data.opencodeGo) data.opencodeGo = []
        const acc = account as OpencodeGoAccount
        const existingIdx = data.opencodeGo.findIndex(a => a.id === acc.id)
        if (existingIdx >= 0) {
          data.opencodeGo[existingIdx] = acc
        } else {
          data.opencodeGo.push(acc)
        }
        break
      }
      case 'ollamaCloud': {
        const acc = account as OllamaCloudAccount
        const existingIdx = data.ollamaCloud.findIndex(a => a.id === acc.id)
        if (existingIdx >= 0) {
          data.ollamaCloud[existingIdx] = acc
        } else {
          data.ollamaCloud.push(acc)
        }
        break
      }
      case 'aiStudio': {
        const acc = account as AiStudioAccount
        const existingIdx = data.aiStudio.findIndex(a => a.id === acc.id)
        if (existingIdx >= 0) {
          data.aiStudio[existingIdx] = acc
        } else {
          data.aiStudio.push(acc)
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
      case 'codex':
        if (data.codex) {
          data.codex = data.codex.filter(a => a.id !== accountId)
        }
        break
      case 'opencodeGo':
        if (data.opencodeGo) {
          data.opencodeGo = data.opencodeGo.filter(a => a.id !== accountId)
        }
        break
      case 'ollamaCloud':
        data.ollamaCloud = data.ollamaCloud.filter(a => a.id !== accountId)
        break
      case 'aiStudio':
        data.aiStudio = data.aiStudio.filter(a => a.id !== accountId)
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
    updates: Partial<AntigravityAccount> | Partial<GithubCopilotAccount> | Partial<ZaiCodingAccount> | Partial<CodexAccount> | Partial<OpencodeGoAccount> | Partial<OllamaCloudAccount> | Partial<AiStudioAccount>
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
      case 'codex': {
        if (!data.codex) data.codex = []
        const idx = data.codex.findIndex(a => a.id === accountId)
        if (idx >= 0) {
          data.codex[idx] = { ...data.codex[idx], ...updates as Partial<CodexAccount> }
        }
        break
      }
      case 'opencodeGo': {
        if (!data.opencodeGo) data.opencodeGo = []
        const idx = data.opencodeGo.findIndex(a => a.id === accountId)
        if (idx >= 0) {
          data.opencodeGo[idx] = { ...data.opencodeGo[idx], ...updates as Partial<OpencodeGoAccount> }
        }
        break
      }
      case 'ollamaCloud': {
        const idx = data.ollamaCloud.findIndex(a => a.id === accountId)
        if (idx >= 0) {
          data.ollamaCloud[idx] = { ...data.ollamaCloud[idx], ...updates as Partial<OllamaCloudAccount> }
        }
        break
      }
      case 'aiStudio': {
        const idx = data.aiStudio.findIndex(a => a.id === accountId)
        if (idx >= 0) {
          data.aiStudio[idx] = { ...data.aiStudio[idx], ...updates as Partial<AiStudioAccount> }
        }
        break
      }
      default:
        return false
    }

    this.saveData(data)
    return true
  }

  getSettings(): Settings {
    const data = this.getData()
    return { ...DEFAULT_SETTINGS, ...data.settings }
  }

  async saveSettings(settings: Partial<Settings>): Promise<boolean> {
    if (
      settings.allowRemoteApiAccess !== undefined &&
      typeof settings.allowRemoteApiAccess !== 'boolean'
    ) {
      return false
    }

    if (
      settings.refreshInterval !== undefined &&
      (!Number.isFinite(settings.refreshInterval) ||
        settings.refreshInterval < MIN_REFRESH_INTERVAL ||
        settings.refreshInterval > MAX_REFRESH_INTERVAL)
    ) {
      return false
    }

    const data = this.getData()
    data.settings = { ...data.settings, ...settings }
    this.saveData(data)
    return true
  }

  getAiStudioOAuthCredentials(): { clientId: string; clientSecret: string } | null {
    const credentials = this.getData().aiStudioOAuth
    return credentials?.clientId && credentials.clientSecret ? { ...credentials } : null
  }

  hasAiStudioOAuthCredentials(): boolean {
    return this.getAiStudioOAuthCredentials() !== null
  }

  saveAiStudioOAuthCredentials(clientId: string, clientSecret: string): boolean {
    const data = this.getData()
    if (data.aiStudioOAuth?.clientId && data.aiStudioOAuth.clientSecret) return false

    const credentials = {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim()
    }
    if (!credentials.clientId || !credentials.clientSecret) return false

    data.aiStudioOAuth = credentials
    this.saveData(data)
    return true
  }

  deleteAiStudioOAuthCredentials(): boolean {
    const data = this.getData()
    if (!data.aiStudioOAuth) return true

    delete data.aiStudioOAuth
    this.saveData(data, true)
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
