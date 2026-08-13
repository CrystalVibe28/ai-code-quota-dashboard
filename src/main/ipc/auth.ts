import { ipcMain, session, type Session } from 'electron'
import { CryptoService } from '../services/crypto'
import { StorageService, StorageVersionTooNewError } from '../services/storage'
import { UsageDataService } from '../services/usage-data'
import { OPENCODE_GO_AUTH_PARTITION } from '../services/providers/opencode-go'
import { OLLAMA_CLOUD_AUTH_PARTITION } from '../services/providers/ollama-cloud'
import type { StorageUnlockResult } from '@shared/types'

const cryptoService = new CryptoService()
const storageService = new StorageService()
const PROVIDER_AUTH_PARTITIONS = [OPENCODE_GO_AUTH_PARTITION, OLLAMA_CLOUD_AUTH_PARTITION]

function unlockStorage(password: string): StorageUnlockResult {
  try {
    storageService.unlock(password)
    return { success: true }
  } catch (error) {
    if (error instanceof StorageVersionTooNewError) {
      return { success: false, reason: 'data-version-too-new' }
    }
    throw error
  }
}

export function unlockWithSkippedPassword(): StorageUnlockResult {
  if (!cryptoService.isPasswordSkipped()) {
    return { success: false, reason: 'password-not-skipped' }
  }
  return unlockStorage(cryptoService.getSkippedPasswordKey())
}

async function clearSessionData(currentSession: Session): Promise<void> {
  await Promise.all([
    currentSession.clearStorageData(),
    currentSession.clearCache()
  ])
}

async function updatePassword(
  oldPassword: string,
  newPassword: string,
  updateAuth: () => Promise<void>
): Promise<void> {
  cryptoService.beginPasswordChange()

  try {
    storageService.reEncrypt(oldPassword, newPassword)
    await updateAuth()
    cryptoService.commitPasswordChange()
  } catch (error) {
    try {
      cryptoService.rollbackPasswordChange()
      storageService.unlock(oldPassword)
    } catch (rollbackError) {
      storageService.lock()
      throw new AggregateError(
        [error, rollbackError],
        'Password change and rollback both failed'
      )
    }
    throw error
  }
}

export function registerAuthHandlers(onStorageStateChanged?: () => Promise<void>): void {
  ipcMain.handle('auth:has-password', async () => {
    return storageService.hasPassword()
  })

  ipcMain.handle('auth:verify-password', async (_, password: string) => {
    const isValid = await cryptoService.verifyPassword(password)
    const result = isValid
      ? unlockStorage(password)
      : { success: false, reason: 'invalid-password' }
    if (result.success) await onStorageStateChanged?.()
    return result
  })

  ipcMain.handle('auth:set-password', async (_, password: string) => {
    await cryptoService.setPassword(password)
    storageService.unlock(password)
    await onStorageStateChanged?.()
    return true
  })

  ipcMain.handle('auth:change-password', async (_, oldPassword: string, newPassword: string) => {
    const isValid = await cryptoService.verifyPassword(oldPassword)
    if (!isValid) return false

    await updatePassword(oldPassword, newPassword, () => (
      cryptoService.changePassword(oldPassword, newPassword)
    ))
    return true
  })

  ipcMain.handle('auth:lock', async () => {
    await Promise.all(PROVIDER_AUTH_PARTITIONS.map(partition => clearSessionData(session.fromPartition(partition))))
    storageService.lock()
    await onStorageStateChanged?.()
  })

  ipcMain.handle('auth:clear-all-data', async (event) => {
    const usageData = UsageDataService.getInstance()
    usageData.invalidateAll()
    await Promise.all([
      clearSessionData(event.sender.session),
      ...PROVIDER_AUTH_PARTITIONS.map(partition => clearSessionData(session.fromPartition(partition)))
    ])
    storageService.clearAllData()
    // Reject refreshes that started while session/storage cleanup was running.
    usageData.invalidateAll()
    await onStorageStateChanged?.()
  })

  ipcMain.handle('auth:skip-password', async () => {
    await cryptoService.skipPassword()
    storageService.unlock(cryptoService.getSkippedPasswordKey())
    await onStorageStateChanged?.()
    return true
  })

  ipcMain.handle('auth:is-password-skipped', async () => {
    return cryptoService.isPasswordSkipped()
  })

  ipcMain.handle('auth:unlock-with-skipped-password', async () => {
    const result = unlockWithSkippedPassword()
    if (result.success) await onStorageStateChanged?.()
    return result
  })

  ipcMain.handle('auth:remove-password', async (_, currentPassword: string) => {
    const isValid = await cryptoService.verifyPassword(currentPassword)
    if (!isValid) return false

    await updatePassword(currentPassword, cryptoService.getSkippedPasswordKey(), () => (
      cryptoService.skipPassword()
    ))
    return true
  })

  ipcMain.handle('auth:set-password-from-settings', async (_, newPassword: string) => {
    if (!cryptoService.isPasswordSkipped()) return false

    await updatePassword(cryptoService.getSkippedPasswordKey(), newPassword, () => (
      cryptoService.setPassword(newPassword)
    ))
    return true
  })
}
