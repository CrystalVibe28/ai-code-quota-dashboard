import { ipcMain } from 'electron'
import { CodexService } from '../services/providers/codex'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import { UsageDataService } from '../services/usage-data'
import type { CodexAccount, CodexAccountUsage } from '@shared/types'
import { refreshCodexTokens, withAutoRefreshCodex } from './utils/withAutoRefreshCodex'
import { singleFlight } from './utils/singleFlight'

const codexService = new CodexService()
const storageService = new StorageService()

async function fetchAllCodexUsageInner(): Promise<CodexAccountUsage[]> {
  const startedAt = Date.now()
  try {
    const accounts = await storageService.getAccounts('codex') as CodexAccount[]
    const results = await Promise.all(
      accounts.map(async (account): Promise<CodexAccountUsage> => {
        try {
          const usage = await withAutoRefreshCodex(account, async (currentAccount) => {
            return await codexService.fetchUsage(currentAccount)
          })

          if (usage === null) {
            return { accountId: account.id, name: account.displayName, email: account.email, usage: null, error: 'Token refresh failed' }
          }

          return { accountId: account.id, name: account.displayName, email: account.email, usage }
        } catch (error) {
          console.error('[Codex] fetch-all-usage error for', account.email, ':', error)
          return { accountId: account.id, name: account.displayName, email: account.email, usage: null, error: String(error) }
        }
      })
    )

    const activeResults = UsageDataService.getInstance()
      .recordProvider('codex', results, Date.now(), startedAt)
    try {
      const trayData = activeResults
        .filter(r => r.usage !== null)
        .map(r => ({ name: r.name, percent: 0 }))
      TrayService.getInstance().triggerUpdate({ codex: trayData })
    } catch (error) {
      console.error('[Codex] Failed to update tray:', error)
    }

    return activeResults
  } catch (error) {
    console.error('[Codex] fetch-all-usage error:', error)
    UsageDataService.getInstance().recordProviderFailure('codex', Date.now(), startedAt)
    return []
  }
}

export const fetchAllCodexUsage = singleFlight(fetchAllCodexUsageInner)

export function registerCodexHandlers(): void {
  ipcMain.handle('codex:login', async () => {
    try {
      const result = await codexService.login()
      if (result.success && result.account) {
        await storageService.saveAccount('codex', result.account as CodexAccount)
      }
      return result
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('codex:cancel-login', () => {
    return codexService.cancelLogin()
  })

  ipcMain.handle('codex:refresh-token', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('codex') as CodexAccount[]
      const account = accounts.find(a => a.id === accountId)
      if (!account) return false

      return Boolean(await refreshCodexTokens(account))
    } catch (error) {
      console.error('[Codex IPC] Failed to refresh token:', error)
      return false
    }
  })

  ipcMain.handle('codex:fetch-usage', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('codex') as CodexAccount[]
      const account = accounts.find(a => a.id === accountId)
      if (!account) return null

      return await withAutoRefreshCodex(account, async (currentAccount) => {
        return await codexService.fetchUsage(currentAccount)
      })
    } catch (error) {
      console.error('[Codex] fetch-usage error:', error)
      return null
    }
  })

  ipcMain.handle('codex:fetch-all-usage', fetchAllCodexUsage)
}
