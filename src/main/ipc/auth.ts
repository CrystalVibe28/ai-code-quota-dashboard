import { ipcMain } from 'electron'
import { CryptoService } from '../services/crypto'
import { StorageService } from '../services/storage'

const cryptoService = new CryptoService()
const storageService = new StorageService()

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
    
    await cryptoService.changePassword(oldPassword, newPassword)
    storageService.unlock(newPassword)
    return true
  })

  ipcMain.handle('auth:lock', async () => {
    storageService.lock()
  })

  ipcMain.handle('auth:skip-password', async () => {
    await cryptoService.skipPassword()
    storageService.unlock(cryptoService.getSkippedPasswordKey())
    return true
  })

  ipcMain.handle('auth:is-password-skipped', async () => {
    return cryptoService.isPasswordSkipped()
  })
}
