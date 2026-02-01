import { ipcMain } from 'electron'
import { ZaiCodingService } from '../services/providers/zai-coding'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import type { ZaiCodingAccount, ZaiAccountUsage } from '@shared/types'

const zaiCodingService = new ZaiCodingService()
const storageService = new StorageService()

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
      console.error('[Z.ai Coding IPC] Failed to fetch usage:', error)
      return null
    }
  })

  ipcMain.handle('zai-coding:fetch-all-usage', async (): Promise<ZaiAccountUsage[]> => {
    try {
      const accounts = await storageService.getAccounts('zaiCoding') as ZaiCodingAccount[]
      const results = await Promise.all(
        accounts.map(async (account): Promise<ZaiAccountUsage> => {
          try {
            const usage = await zaiCodingService.fetchUsage(account.apiKey)
            return { accountId: account.id, name: account.name, usage }
          } catch (error) {
            console.error('[Z.ai Coding] fetch-usage error for', account.name, ':', error)
            return { accountId: account.id, name: account.name, usage: null, error: String(error) }
          }
        })
      )

      const trayService = TrayService.getInstance()
      const trayData = results
        .filter(r => r.usage !== null)
        .map(r => ({ name: r.name, percent: 0 })) // Note: percent would need calculation from usage data
      trayService.triggerUpdate({ zaiCoding: trayData })

      return results
    } catch (error) {
      console.error('[Z.ai Coding IPC] Failed to fetch all usage:', error)
      return []
    }
  })
}
