import { ipcMain } from 'electron'
import { StorageService } from '../services/storage'

const storageService = new StorageService()

export function registerStorageHandlers(): void {
  ipcMain.handle('storage:get-accounts', async (_, provider: string) => {
    return storageService.getAccounts(provider)
  })

  ipcMain.handle('storage:save-account', async (_, provider: string, account: unknown) => {
    return storageService.saveAccount(provider, account)
  })

  ipcMain.handle('storage:delete-account', async (_, provider: string, accountId: string) => {
    return storageService.deleteAccount(provider, accountId)
  })

  ipcMain.handle('storage:update-account', async (_, provider: string, accountId: string, data: unknown) => {
    return storageService.updateAccount(provider, accountId, data)
  })

  ipcMain.handle('storage:get-settings', async () => {
    return storageService.getSettings()
  })

  ipcMain.handle('storage:save-settings', async (_, settings: unknown) => {
    return storageService.saveSettings(settings)
  })

  ipcMain.handle('storage:get-customization', async () => {
    return storageService.getCustomization()
  })

  ipcMain.handle('storage:save-customization', async (_, customization) => {
    return storageService.saveCustomization(customization)
  })
}
