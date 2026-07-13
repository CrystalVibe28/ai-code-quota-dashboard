import { ipcMain, session, type Session } from 'electron'
import { CryptoService } from '../services/crypto'
import { StorageService } from '../services/storage'
import { OPENCODE_GO_AUTH_PARTITION } from '../services/providers/opencode-go'

const cryptoService = new CryptoService()
const storageService = new StorageService()

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

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:has-password', async () => {
    return storageService.hasPassword()
  })

  ipcMain.handle('auth:verify-password', async (_, password: string) => {
    const isValid = await cryptoService.verifyPassword(password)
    if (isValid) {
      storageService.unlock(password)
    }
    return isValid
  })

  ipcMain.handle('auth:set-password', async (_, password: string) => {
    await cryptoService.setPassword(password)
    storageService.unlock(password)
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
    await clearSessionData(session.fromPartition(OPENCODE_GO_AUTH_PARTITION))
    storageService.lock()
  })

  ipcMain.handle('auth:clear-all-data', async (event) => {
    await Promise.all([
      clearSessionData(event.sender.session),
      clearSessionData(session.fromPartition(OPENCODE_GO_AUTH_PARTITION))
    ])
    storageService.clearAllData()
  })

  ipcMain.handle('auth:skip-password', async () => {
    await cryptoService.skipPassword()
    storageService.unlock(cryptoService.getSkippedPasswordKey())
    return true
  })

  ipcMain.handle('auth:is-password-skipped', async () => {
    return cryptoService.isPasswordSkipped()
  })

  ipcMain.handle('auth:unlock-with-skipped-password', async () => {
    if (cryptoService.isPasswordSkipped()) {
      storageService.unlock(cryptoService.getSkippedPasswordKey())
      return true
    }
    return false
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
