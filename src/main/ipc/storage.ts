import { ipcMain, session } from 'electron'
import { StorageService } from '../services/storage'
import { UsageDataService } from '../services/usage-data'
import { OPENCODE_GO_AUTH_PARTITION } from '../services/providers/opencode-go'
import { OLLAMA_CLOUD_AUTH_PARTITION } from '../services/providers/ollama-cloud'
import type {
  AntigravityAccount,
  GithubCopilotAccount,
  ZaiCodingAccount,
  ProviderId,
  Settings,
  CustomizationState
} from '@shared/types'

const storageService = new StorageService()
const AUTH_PARTITIONS: Record<string, string> = {
  opencodeGo: OPENCODE_GO_AUTH_PARTITION,
  ollamaCloud: OLLAMA_CLOUD_AUTH_PARTITION
}

export function registerStorageHandlers(onRemoteApiAccessChanged?: () => Promise<void>): void {
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
    if (typeof provider !== 'string' || typeof accountId !== 'string' || !accountId.trim()) {
      return false
    }

    const partition = AUTH_PARTITIONS[provider]
    if (partition) {
      const authSession = session.fromPartition(partition)
      await Promise.all([
        authSession.clearStorageData(),
        authSession.clearCache()
      ])
    }

    const deleted = await storageService.deleteAccount(provider, accountId)
    if (!deleted) return false
    return UsageDataService.getInstance().deleteAccount(provider as ProviderId, accountId)
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

  ipcMain.handle('storage:get-quota-history', (_, provider: ProviderId, accountId: string) => {
    if (typeof provider !== 'string' || typeof accountId !== 'string' || !accountId) {
      return { weekly: [], monthly: [], audit: { provider: [], account: [] } }
    }
    return UsageDataService.getInstance().getQuotaHistory(provider, accountId)
  })

  ipcMain.handle('storage:save-settings', async (_, settings: Partial<Settings>) => {
    const saved = await storageService.saveSettings(settings)
    if (saved && settings.allowRemoteApiAccess !== undefined) {
      await onRemoteApiAccessChanged?.()
    }
    return saved
  })

  ipcMain.handle('storage:get-customization', async () => {
    return storageService.getCustomization()
  })

  ipcMain.handle('storage:save-customization', async (_, customization: CustomizationState) => {
    return storageService.saveCustomization(customization)
  })
}
