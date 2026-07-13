import { ipcMain, session } from 'electron'
import { StorageService } from '../services/storage'
import { OPENCODE_GO_AUTH_PARTITION } from '../services/providers/opencode-go'
import type {
  AntigravityAccount,
  GithubCopilotAccount,
  ZaiCodingAccount,
  Settings,
  CustomizationState
} from '@shared/types'

const storageService = new StorageService()

export function registerStorageHandlers(): void {
  ipcMain.handle('storage:get-accounts', async (_, provider: string) => {
    return storageService.getAccounts(provider)
  })

  ipcMain.handle('storage:save-account', async (
    _, 
    provider: string, 
    account: AntigravityAccount | GithubCopilotAccount | ZaiCodingAccount
  ) => {
    return storageService.saveAccount(provider, account)
  })

  ipcMain.handle('storage:delete-account', async (_, provider: string, accountId: string) => {
    if (provider === 'opencodeGo') {
      const authSession = session.fromPartition(OPENCODE_GO_AUTH_PARTITION)
      await Promise.all([
        authSession.clearStorageData(),
        authSession.clearCache()
      ])
    }

    return storageService.deleteAccount(provider, accountId)
  })

  ipcMain.handle('storage:update-account', async (
    _, 
    provider: string, 
    accountId: string, 
    data: Partial<AntigravityAccount> | Partial<GithubCopilotAccount> | Partial<ZaiCodingAccount>
  ) => {
    return storageService.updateAccount(provider, accountId, data)
  })

  ipcMain.handle('storage:get-settings', async () => {
    return storageService.getSettings()
  })

  ipcMain.handle('storage:save-settings', async (_, settings: Partial<Settings>) => {
    return storageService.saveSettings(settings)
  })

  ipcMain.handle('storage:get-customization', async () => {
    return storageService.getCustomization()
  })

  ipcMain.handle('storage:save-customization', async (_, customization: CustomizationState) => {
    return storageService.saveCustomization(customization)
  })
}
