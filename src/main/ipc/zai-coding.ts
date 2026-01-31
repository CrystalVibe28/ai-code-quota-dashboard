import { ipcMain } from 'electron'
import { ZaiCodingService } from '../services/providers/zai-coding'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'

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
      const accounts = await storageService.getAccounts('zaiCoding')
      const account = accounts.find((a: any) => a.id === accountId)
      if (!account) return null

      return await zaiCodingService.fetchUsage((account as any).apiKey)
    } catch (error) {
      console.error('[Z.ai Coding IPC] Failed to fetch usage:', error)
      return null
    }
  })

  ipcMain.handle('zai-coding:fetch-all-usage', async () => {
    try {
      const accounts = await storageService.getAccounts('zaiCoding')
      const results = await Promise.all(
        accounts.map(async (account: any) => {
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
        .filter((r: any) => r.usage !== null)
        .map((r: any) => ({ name: r.name, percent: r.usage?.percent || 0 }))
      trayService.triggerUpdate({ zaiCoding: trayData })

      return results
    } catch (error) {
      console.error('[Z.ai Coding IPC] Failed to fetch all usage:', error)
      return []
    }
  })
}
