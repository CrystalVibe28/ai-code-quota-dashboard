import { ipcMain } from 'electron'
import { ZaiCodingService } from '../services/providers/zai-coding'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import { UsageDataService } from '../services/usage-data'
import type { ZaiCodingAccount, ZaiAccountUsage } from '@shared/types'
import { singleFlight } from './utils/singleFlight'

const zaiCodingService = new ZaiCodingService()
const storageService = new StorageService()

async function fetchAllZaiCodingUsageInner(): Promise<ZaiAccountUsage[]> {
  const startedAt = Date.now()
  try {
    const accounts = await storageService.getAccounts('zaiCoding') as ZaiCodingAccount[]
    const results = await Promise.all(
      accounts.map(async (account): Promise<ZaiAccountUsage> => {
        try {
          const usage = await zaiCodingService.fetchUsage(account.apiKey)
          return { accountId: account.id, name: account.name, usage }
        } catch (error) {
          console.error('[Zai Coding Plan] fetch-usage error for', account.name, ':', error)
          return { accountId: account.id, name: account.name, usage: null, error: String(error) }
        }
      })
    )

    const activeResults = UsageDataService.getInstance()
      .recordProvider('zaiCoding', results, Date.now(), startedAt)
    try {
      const trayData = activeResults
        .filter(r => r.usage !== null)
        .map(r => ({ name: r.name, percent: 0 }))
      TrayService.getInstance().triggerUpdate({ zaiCoding: trayData })
    } catch (error) {
      console.error('[Zai Coding Plan] Failed to update tray:', error)
    }

    return activeResults
  } catch (error) {
    console.error('[Zai Coding Plan IPC] Failed to fetch all usage:', error)
    UsageDataService.getInstance().recordProviderFailure('zaiCoding', Date.now(), startedAt)
    return []
  }
}

export const fetchAllZaiCodingUsage = singleFlight(fetchAllZaiCodingUsageInner)

export function registerZaiCodingHandlers(): void {
  ipcMain.handle('zai-coding:validate-api-key', async (_, apiKey: string) => {
    try {
      return await zaiCodingService.validateApiKey(apiKey)
    } catch (error) {
      return { valid: false, error: String(error) }
    }
  })

  ipcMain.handle('zai-coding:fetch-usage', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('zaiCoding') as ZaiCodingAccount[]
      const account = accounts.find(a => a.id === accountId)
      if (!account) return null

      return await zaiCodingService.fetchUsage(account.apiKey)
    } catch (error) {
      console.error('[Zai Coding Plan IPC] Failed to fetch usage:', error)
      return null
    }
  })

  ipcMain.handle('zai-coding:fetch-all-usage', fetchAllZaiCodingUsage)
}
