import { ipcMain } from 'electron'
import { ZaiCodingService } from '../services/providers/zai-coding'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import { UsageDataService } from '../services/usage-data'
import type { ZaiCodingAccount, ZaiAccountUsage } from '@shared/types'

const zaiCodingService = new ZaiCodingService()
const storageService = new StorageService()

export async function fetchAllZaiCodingUsage(): Promise<ZaiAccountUsage[]> {
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

    UsageDataService.getInstance().recordProvider('zaiCoding', results)
    const trayData = results
      .filter(r => r.usage !== null)
      .map(r => ({ name: r.name, percent: 0 }))
    TrayService.getInstance().triggerUpdate({ zaiCoding: trayData })

    return results
  } catch (error) {
    console.error('[Zai Coding Plan IPC] Failed to fetch all usage:', error)
    return []
  }
}

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
