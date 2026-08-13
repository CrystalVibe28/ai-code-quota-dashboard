import { ipcMain } from 'electron'
import { AntigravityService } from '../services/providers/antigravity'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import { UsageDataService } from '../services/usage-data'
import type { AntigravityAccount, AntigravityUsage } from '@shared/types'
import { refreshAntigravityTokens, withAutoRefresh } from './utils/withAutoRefresh'
import { singleFlight } from './utils/singleFlight'

const antigravityService = new AntigravityService()
const storageService = new StorageService()

async function fetchAllAntigravityUsageInner(): Promise<AntigravityUsage[]> {
  const startedAt = Date.now()
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

    const activeResults = UsageDataService.getInstance()
      .recordProvider('antigravity', results, Date.now(), startedAt)
    try {
      const trayData = activeResults
        .filter(r => r.usage && r.usage.length > 0)
        .map(r => ({
          name: r.name,
          percent: Math.round(Math.min(...r.usage!.map(quota => quota.remainingFraction)) * 100)
        }))
      TrayService.getInstance().triggerUpdate({ antigravity: trayData })
    } catch (error) {
      console.error('[Antigravity] Failed to update tray:', error)
    }

    return activeResults
  } catch (error) {
    console.error('[Antigravity] fetch-all-usage error:', error)
    UsageDataService.getInstance().recordProviderFailure('antigravity', Date.now(), startedAt)
    return []
  }
}

export const fetchAllAntigravityUsage = singleFlight(fetchAllAntigravityUsageInner)

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

      return Boolean(await refreshAntigravityTokens(account))
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
