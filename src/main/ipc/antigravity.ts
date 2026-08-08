import { ipcMain } from 'electron'
import { AntigravityService } from '../services/providers/antigravity'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import { UsageDataService } from '../services/usage-data'
import type { AntigravityAccount, AntigravityUsage } from '@shared/types'
import { withAutoRefresh } from './utils/withAutoRefresh'

const antigravityService = new AntigravityService()
const storageService = new StorageService()

export async function fetchAllAntigravityUsage(): Promise<AntigravityUsage[]> {
  try {
    const accounts = await storageService.getAccounts('antigravity') as AntigravityAccount[]
    const results = await Promise.all(
      accounts.map(async (account): Promise<AntigravityUsage> => {
        try {
          const usage = await withAutoRefresh(account, async (currentAccount) => {
            return await antigravityService.fetchUsage(currentAccount)
          })

          if (usage === null) {
            return { accountId: account.id, name: account.name, email: account.email, usage: null, error: 'Token refresh failed' }
          }

          return { accountId: account.id, name: account.name, email: account.email, usage }
        } catch (error) {
          console.error('[Antigravity] fetch-all-usage error for', account.email, ':', error)
          return { accountId: account.id, name: account.name, email: account.email, usage: null, error: String(error) }
        }
      })
    )

    UsageDataService.getInstance().recordProvider('antigravity', results)
    const trayData = results
      .filter(r => r.usage && r.usage.length > 0)
      .map(r => ({
        name: r.name,
        percent: Math.round(Math.min(...r.usage!.map(quota => quota.remainingFraction)) * 100)
      }))
    TrayService.getInstance().triggerUpdate({ antigravity: trayData })

    return results
  } catch (error) {
    console.error('[Antigravity] fetch-all-usage error:', error)
    return []
  }
}

export function registerAntigravityHandlers(): void {
  ipcMain.handle('antigravity:login', async () => {
    try {
      const result = await antigravityService.login()
      if (result.success && result.account) {
        await storageService.saveAccount('antigravity', result.account as AntigravityAccount)
      }
      return result
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('antigravity:cancel-login', () => {
    return antigravityService.cancelLogin()
  })

  ipcMain.handle('antigravity:refresh-token', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('antigravity') as AntigravityAccount[]
      const account = accounts.find(a => a.id === accountId)
      if (!account) return false

      const newTokens = await antigravityService.refreshToken(account.refreshToken)
      if (newTokens) {
        await storageService.updateAccount('antigravity', accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresAt: newTokens.expiresAt
        })
        return true
      }
      return false
    } catch (error) {
      console.error('[Antigravity IPC] Failed to refresh token:', error)
      return false
    }
  })

  ipcMain.handle('antigravity:fetch-usage', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('antigravity') as AntigravityAccount[]
      const account = accounts.find(a => a.id === accountId)
      if (!account) return null

      return await withAutoRefresh(account, async (currentAccount) => {
        return await antigravityService.fetchUsage(currentAccount)
      })
    } catch (error) {
      console.error('[Antigravity] fetch-usage error:', error)
      return null
    }
  })

  ipcMain.handle('antigravity:fetch-all-usage', fetchAllAntigravityUsage)
}
