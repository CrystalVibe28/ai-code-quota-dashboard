import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const electronMock = vi.hoisted(() => ({ userDataPath: '' }))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => electronMock.userDataPath),
    getLocale: vi.fn(() => 'en')
  }
}))

import { CryptoService } from '../crypto'
import { StorageService, StorageVersionTooNewError } from '../storage'

function resetStorageService(): void {
  Reflect.set(StorageService, 'instance', undefined)
}

describe('StorageService persistence', () => {
  beforeEach(() => {
    electronMock.userDataPath = mkdtempSync(join(tmpdir(), 'quota-dashboard-'))
    resetStorageService()
  })

  afterEach(() => {
    resetStorageService()
    rmSync(electronMock.userDataPath, { recursive: true, force: true })
  })

  it('recovers the last valid data when the primary file is corrupted', async () => {
    const storage = new StorageService()
    storage.unlock('password')
    await storage.saveAccount('zaiCoding', {
      id: 'zai-1',
      displayName: 'Zai account',
      showInOverview: true,
      name: 'Zai account',
      apiKey: 'secret',
      selectedLimits: []
    })
    await storage.saveSettings({ language: 'zh-TW' })
    await storage.saveSettings({ language: 'en' })

    const storagePath = join(electronMock.userDataPath, 'data', 'credentials.enc')
    writeFileSync(storagePath, 'partial write')
    resetStorageService()

    const recoveredStorage = new StorageService()
    recoveredStorage.unlock('password')

    expect((await recoveredStorage.getSettings()).language).toBe('zh-TW')
    expect(await recoveredStorage.getAccounts('zaiCoding')).toHaveLength(1)
    expect(readFileSync(storagePath, 'utf-8')).not.toBe('partial write')
  })

  it('stays locked when both the primary file and backup are corrupted', async () => {
    const storage = new StorageService()
    storage.unlock('password')
    await storage.saveSettings({ language: 'zh-TW' })
    await storage.saveSettings({ language: 'en' })

    const storagePath = join(electronMock.userDataPath, 'data', 'credentials.enc')
    writeFileSync(storagePath, 'corrupt primary')
    writeFileSync(`${storagePath}.bak`, 'corrupt backup')
    resetStorageService()

    const corruptedStorage = new StorageService()
    expect(() => corruptedStorage.unlock('password')).toThrow('Failed to load storage data')
    expect(corruptedStorage.isUnlocked()).toBe(false)
  })

  it('does not replace newer data with an older backup', () => {
    const crypto = new CryptoService()
    const storage = new StorageService()
    const storagePath = join(electronMock.userDataPath, 'data', 'credentials.enc')
    const currentData = {
      antigravity: [],
      githubCopilot: [],
      zaiCoding: [],
      codex: [],
      opencodeGo: [],
      ollamaCloud: [],
      aiStudio: [],
      settings: {}
    }
    const primary = crypto.encrypt(JSON.stringify({ ...currentData, _version: 7 }), 'password')
    const backup = crypto.encrypt(JSON.stringify({ ...currentData, _version: 6 }), 'password')
    writeFileSync(storagePath, primary)
    writeFileSync(`${storagePath}.bak`, backup)

    expect(() => storage.unlock('password')).toThrow(StorageVersionTooNewError)
    expect(storage.isUnlocked()).toBe(false)
    expect(readFileSync(storagePath, 'utf-8')).toBe(primary)
    expect(readFileSync(`${storagePath}.bak`, 'utf-8')).toBe(backup)
  })

  it('rolls back both files after an interrupted password change', async () => {
    const crypto = new CryptoService()
    await crypto.setPassword('old-password')

    const storage = new StorageService()
    storage.unlock('old-password')
    await storage.saveSettings({ language: 'zh-TW' })

    crypto.beginPasswordChange()
    storage.reEncrypt('old-password', 'new-password')
    await crypto.changePassword('old-password', 'new-password')

    resetStorageService()
    const recoveredCrypto = new CryptoService()
    expect(await recoveredCrypto.verifyPassword('old-password')).toBe(true)
    expect(await recoveredCrypto.verifyPassword('new-password')).toBe(false)

    const recoveredStorage = new StorageService()
    recoveredStorage.unlock('old-password')
    expect((await recoveredStorage.getSettings()).language).toBe('zh-TW')
    expect(existsSync(join(electronMock.userDataPath, 'data', 'password-change.json'))).toBe(false)
  })

  it('stores AI Studio OAuth credentials once and removes them from recovery data', async () => {
    const storage = new StorageService()
    storage.unlock('password')

    expect(await storage.saveAiStudioOAuthCredentials(' client-id ', ' client-secret ')).toBe(true)
    expect(await storage.saveAiStudioOAuthCredentials('replacement-id', 'replacement-secret')).toBe(false)
    expect(await storage.getAiStudioOAuthCredentials()).toEqual({
      clientId: 'client-id',
      clientSecret: 'client-secret'
    })

    expect(await storage.deleteAiStudioOAuthCredentials()).toBe(true)
    expect(await storage.hasAiStudioOAuthCredentials()).toBe(false)

    const storagePath = join(electronMock.userDataPath, 'data', 'credentials.enc')
    writeFileSync(storagePath, 'corrupt primary')
    resetStorageService()

    const recoveredStorage = new StorageService()
    recoveredStorage.unlock('password')
    expect(await recoveredStorage.hasAiStudioOAuthCredentials()).toBe(false)
  })

  it('rejects refresh intervals outside the supported range', async () => {
    const storage = new StorageService()
    storage.unlock('password')

    await expect(storage.saveSettings({ refreshInterval: 0 })).resolves.toBe(false)
    await expect(storage.saveSettings({ refreshInterval: Number.NaN })).resolves.toBe(false)
    await expect(storage.saveSettings({ refreshInterval: 301 })).resolves.toBe(false)
    expect(storage.getSettings().refreshInterval).toBe(60)
  })

  it('defaults remote API access to off and accepts only booleans', async () => {
    const storage = new StorageService()
    storage.unlock('password')

    expect(storage.getSettings().allowRemoteApiAccess).toBe(false)
    await expect(storage.saveSettings({ allowRemoteApiAccess: true })).resolves.toBe(true)
    await expect(storage.saveSettings({
      allowRemoteApiAccess: 'yes' as unknown as boolean
    })).resolves.toBe(false)
    expect(storage.getSettings().allowRemoteApiAccess).toBe(true)
  })
})
