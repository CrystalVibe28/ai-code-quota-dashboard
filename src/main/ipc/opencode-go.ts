import { ipcMain } from 'electron'
import { OpencodeGoService } from '../services/providers/opencode-go'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import { UsageDataService } from '../services/usage-data'
import type { OpencodeGoAccount, OpencodeGoAccountUsage, OpencodeGoUsage } from '@shared/types'
import { singleFlight } from './utils/singleFlight'

const opencodeGoService = new OpencodeGoService()
const storageService = new StorageService()

async function fetchAccountUsage(account: OpencodeGoAccount): Promise<OpencodeGoUsage> {
  // The Electron partition is provider-wide, so it cannot safely refresh one account.
  // Keep the stored account cookie isolated and require login again after it expires.
  return opencodeGoService.fetchUsage(account)
}

function getTrayPercent(usage: OpencodeGoUsage): number {
  if (usage.limits.length === 0) {
    return 0
  }

  return Math.round(Math.min(...usage.limits.map(limit => limit.remaining)))
}

async function fetchAllOpencodeGoUsageInner(): Promise<OpencodeGoAccountUsage[]> {
  const startedAt = Date.now()
  try {
    const accounts = await storageService.getAccounts('opencodeGo') as OpencodeGoAccount[]
    const results = await Promise.all(
      accounts.map(async (account): Promise<OpencodeGoAccountUsage> => {
        try {
          const usage = await fetchAccountUsage(account)
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

    const activeResults = UsageDataService.getInstance()
      .recordProvider('opencodeGo', results, Date.now(), startedAt)
    try {
      const trayData = activeResults
        .filter((result): result is OpencodeGoAccountUsage & { usage: OpencodeGoUsage } => result.usage !== null)
        .map(result => ({ name: result.name, percent: getTrayPercent(result.usage) }))
      TrayService.getInstance().triggerUpdate({ opencodeGo: trayData })
    } catch (error) {
      console.error('[Opencode Go] Failed to update tray:', error)
    }

    return activeResults
  } catch (error) {
    console.error('[Opencode Go] fetch-all-usage error:', error)
    UsageDataService.getInstance().recordProviderFailure('opencodeGo', Date.now(), startedAt)
    return []
  }
}

export const fetchAllOpencodeGoUsage = singleFlight(fetchAllOpencodeGoUsageInner)

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

  ipcMain.handle('opencode-go:refresh-token', () => false)

  ipcMain.handle('opencode-go:fetch-usage', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('opencodeGo') as OpencodeGoAccount[]
      const account = accounts.find(a => a.id === accountId)
      if (!account) return null

      return await fetchAccountUsage(account)
    } catch (error) {
      console.error('[Opencode Go] fetch-usage error:', error)
      return null
    }
  })

  ipcMain.handle('opencode-go:fetch-all-usage', fetchAllOpencodeGoUsage)
}
