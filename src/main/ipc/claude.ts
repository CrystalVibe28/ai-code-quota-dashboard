import { ipcMain } from 'electron'
import { ClaudeService } from '../services/providers/claude'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import { UsageDataService } from '../services/usage-data'
import type { ClaudeAccount, ClaudeAccountUsage, ClaudeUsage } from '@shared/types'
import { singleFlight } from './utils/singleFlight'

const claudeService = new ClaudeService()
const storageService = new StorageService()

async function fetchAllClaudeUsageInner(): Promise<ClaudeAccountUsage[]> {
  const startedAt = Date.now()
  try {
    const accounts = await storageService.getAccounts('claude') as ClaudeAccount[]
    const results = await Promise.all(accounts.map(async (account): Promise<ClaudeAccountUsage> => {
      try {
        return {
          accountId: account.id,
          name: account.displayName,
          email: account.email,
          usage: await claudeService.fetchUsage()
        }
      } catch (error) {
        return {
          accountId: account.id,
          name: account.displayName,
          email: account.email,
          usage: null,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }))

    const activeResults = UsageDataService.getInstance()
      .recordProvider('claude', results, Date.now(), startedAt)
    try {
      const trayData = activeResults
        .filter((result): result is ClaudeAccountUsage & { usage: ClaudeUsage } => (
          result.usage !== null && result.usage.limits.length > 0
        ))
        .map(result => ({
          name: result.name,
          percent: Math.round(Math.min(...result.usage.limits.map(limit => limit.remaining)))
        }))
      TrayService.getInstance().triggerUpdate({ claude: trayData })
    } catch (error) {
      console.error('[Claude] Failed to update tray:', error)
    }

    return activeResults
  } catch (error) {
    console.error('[Claude] fetch-all-usage error:', error)
    UsageDataService.getInstance().recordProviderFailure('claude', Date.now(), startedAt)
    return []
  }
}

export const fetchAllClaudeUsage = singleFlight(fetchAllClaudeUsageInner)

export function registerClaudeHandlers(): void {
  ipcMain.handle('claude:login', async () => {
    try {
      // The local Claude Code login is the only credential source, so it maps to a single account.
      const [existing] = await storageService.getAccounts('claude') as ClaudeAccount[]
      const result = await claudeService.login(existing)
      if (result.success && result.account) {
        await storageService.saveAccount('claude', result.account)
      }
      return result
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('claude:fetch-all-usage', fetchAllClaudeUsage)
}
