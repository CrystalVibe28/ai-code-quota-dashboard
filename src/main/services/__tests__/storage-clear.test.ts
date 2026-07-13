import { beforeEach, describe, expect, it, vi } from 'vitest'
import { join } from 'path'

const fsMocks = vi.hoisted(() => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  rmSync: vi.fn()
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => 'C:\\mock-user-data'),
    getLocale: vi.fn(() => 'en')
  }
}))

vi.mock('fs', () => ({ ...fsMocks, default: fsMocks }))

import { StorageService } from '../storage'

describe('StorageService clearAllData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fsMocks.existsSync.mockReturnValue(false)
  })

  it('should lock storage, delete the data directory, and recreate it empty', () => {
    const storageService = new StorageService()
    storageService.unlock('password')

    storageService.clearAllData()

    const dataPath = join('C:\\mock-user-data', 'data')
    expect(storageService.isUnlocked()).toBe(false)
    expect(fsMocks.rmSync).toHaveBeenCalledWith(dataPath, { recursive: true, force: true })
    expect(fsMocks.mkdirSync).toHaveBeenCalledWith(dataPath, { recursive: true })
  })
})
