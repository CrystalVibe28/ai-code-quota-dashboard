import { ipcMain } from 'electron'
import { OpencodeGoService } from '../services/providers/opencode-go'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import type { OpencodeGoAccount, OpencodeGoAccountUsage, OpencodeGoUsage } from '@shared/types'

const opencodeGoService = new OpencodeGoService()
const storageService = new StorageService()
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

async function getFreshAccount(account: OpencodeGoAccount): Promise<OpencodeGoAccount> {
  if (Date.now() <= account.expiresAt - REFRESH_THRESHOLD_MS) {
    return account
  }

  const refreshed = await opencodeGoService.refreshCookies(account)
  if (!refreshed) {
    return account
  }

  await storageService.updateAccount('opencodeGo', account.id, refreshed)
  return { ...account, ...refreshed }
}

async function fetchUsageWithRefresh(account: OpencodeGoAccount): Promise<OpencodeGoUsage> {
  let currentAccount = await getFreshAccount(account)

  try {
    return await opencodeGoService.fetchUsage(currentAccount)
  } catch (error) {
    if (!String(error).toLowerCase().includes('session expired')) {
      throw error
    }

    const refreshed = await opencodeGoService.refreshCookies(account)
    if (!refreshed) {
      throw error
    }

    await storageService.updateAccount('opencodeGo', account.id, refreshed)
    currentAccount = { ...account, ...refreshed }
    return await opencodeGoService.fetchUsage(currentAccount)
  }
}

function getTrayPercent(usage: OpencodeGoUsage): number {
  if (usage.limits.length === 0) {
    return 0
  }

  return Math.round(Math.min(...usage.limits.map(limit => limit.remaining)))
}

export function registerOpencodeGoHandlers(): void {
  ipcMain.handle('opencode-go:login', async () => {
    try {
      const result = await opencodeGoService.login()
      if (result.success && result.account) {
        await storageService.saveAccount('opencodeGo', result.account)
      }
      return result
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('opencode-go:cancel-login', () => {
    return opencodeGoService.cancelLogin()
  })

  ipcMain.handle('opencode-go:refresh-token', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('opencodeGo') as OpencodeGoAccount[]
      const account = accounts.find(a => a.id === accountId)
      if (!account) return false

      const refreshed = await opencodeGoService.refreshCookies(account)
      if (!refreshed) return false

      await storageService.updateAccount('opencodeGo', accountId, refreshed)
      return true
    } catch (error) {
      console.error('[Opencode Go IPC] Failed to refresh cookies:', error)
      return false
    }
  })

  ipcMain.handle('opencode-go:fetch-usage', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('opencodeGo') as OpencodeGoAccount[]
      const account = accounts.find(a => a.id === accountId)
      if (!account) return null

      return await fetchUsageWithRefresh(account)
    } catch (error) {
      console.error('[Opencode Go] fetch-usage error:', error)
      return null
    }
  })

  ipcMain.handle('opencode-go:fetch-all-usage', async (): Promise<OpencodeGoAccountUsage[]> => {
    try {
      const accounts = await storageService.getAccounts('opencodeGo') as OpencodeGoAccount[]
      const results = await Promise.all(
        accounts.map(async (account): Promise<OpencodeGoAccountUsage> => {
          try {
            const usage = await fetchUsageWithRefresh(account)
            return {
              accountId: account.id,
              name: account.displayName,
              workspaceId: account.workspaceId,
              usage
            }
          } catch (error) {
            console.error('[Opencode Go] fetch-all-usage error for', account.workspaceId, ':', error)
            return {
              accountId: account.id,
              name: account.displayName,
              workspaceId: account.workspaceId,
              usage: null,
              error: String(error)
            }
          }
        })
      )

      const trayService = TrayService.getInstance()
      const trayData = results
        .filter((result): result is OpencodeGoAccountUsage & { usage: OpencodeGoUsage } => result.usage !== null)
        .map(result => ({ name: result.name, percent: getTrayPercent(result.usage) }))
      trayService.triggerUpdate({ opencodeGo: trayData })

      return results
    } catch (error) {
      console.error('[Opencode Go] fetch-all-usage error:', error)
      return []
    }
  })
}
