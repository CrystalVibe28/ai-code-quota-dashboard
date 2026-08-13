import { ipcMain } from 'electron'
import { OllamaCloudService } from '../services/providers/ollama-cloud'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import { UsageDataService } from '../services/usage-data'
import type { OllamaCloudAccount, OllamaCloudAccountUsage, OllamaCloudUsage } from '@shared/types'
import { singleFlight } from './utils/singleFlight'

const ollamaCloudService = new OllamaCloudService()
const storageService = new StorageService()

async function fetchAllOllamaCloudUsageInner(): Promise<OllamaCloudAccountUsage[]> {
  const startedAt = Date.now()
  try {
    const accounts = await storageService.getAccounts('ollamaCloud') as OllamaCloudAccount[]
    const results = await Promise.all(accounts.map(async (account): Promise<OllamaCloudAccountUsage> => {
      try {
        return {
          accountId: account.id,
          name: account.displayName,
          email: account.email,
          usage: await ollamaCloudService.fetchUsage(account)
        }
      } catch (error) {
        return {
          accountId: account.id,
          name: account.displayName,
          email: account.email,
          usage: null,
          error: String(error)
        }
      }
    }))

    const activeResults = UsageDataService.getInstance()
      .recordProvider('ollamaCloud', results, Date.now(), startedAt)
    try {
      const trayData = activeResults
        .filter((result): result is OllamaCloudAccountUsage & { usage: OllamaCloudUsage } => result.usage !== null)
        .map(result => ({
          name: result.name,
          percent: Math.round(Math.min(...result.usage.limits.map(limit => limit.remaining)))
        }))
      TrayService.getInstance().triggerUpdate({ ollamaCloud: trayData })
    } catch (error) {
      console.error('[Ollama Cloud] Failed to update tray:', error)
    }

    return activeResults
  } catch (error) {
    console.error('[Ollama Cloud] fetch-all-usage error:', error)
    UsageDataService.getInstance().recordProviderFailure('ollamaCloud', Date.now(), startedAt)
    return []
  }
}

export const fetchAllOllamaCloudUsage = singleFlight(fetchAllOllamaCloudUsageInner)

export function registerOllamaCloudHandlers(): void {
  ipcMain.handle('ollama-cloud:login', async () => {
    try {
      const result = await ollamaCloudService.login()
      if (result.success && result.account) {
        await storageService.saveAccount('ollamaCloud', result.account)
      }
      return result
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('ollama-cloud:cancel-login', () => ollamaCloudService.cancelLogin())

  ipcMain.handle('ollama-cloud:fetch-all-usage', fetchAllOllamaCloudUsage)
}
