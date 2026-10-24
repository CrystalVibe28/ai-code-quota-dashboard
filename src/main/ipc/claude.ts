import { ipcMain } from 'electron'
import { CLAUDE_SIGN_IN_REQUIRED, ClaudeService } from '../services/providers/claude'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import { UsageDataService } from '../services/usage-data'
import type { ClaudeAccount, ClaudeAccountUsage, ClaudeUsage } from '@shared/types'
import { withAutoRefreshClaude } from './utils/withAutoRefreshClaude'
import { singleFlight } from './utils/singleFlight'

const claudeService = new ClaudeService()
const storageService = new StorageService()

async function fetchAllClaudeUsageInner(): Promise<ClaudeAccountUsage[]> {
  const startedAt = Date.now()
  try {
    const accounts = await storageService.getAccounts('claude') as ClaudeAccount[]
    const results = await Promise.all(accounts.map(async (account): Promise<ClaudeAccountUsage> => {
      try {
        const usage = await withAutoRefreshClaude(account, currentAccount => (
          claudeService.fetchUsage(currentAccount)
        ))
        return {
          accountId: account.id,
          name: account.displayName,
          email: account.email,
          usage,
          ...(usage === null ? { error: CLAUDE_SIGN_IN_REQUIRED } : {})
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
      const result = await claudeService.login()
      if (!result.success || !result.account) return result

      const signedIn = result.account
      const accounts = await storageService.getAccounts('claude') as ClaudeAccount[]
      // Accounts added before in-app sign-in have no tokens; signing in adopts them so their history is kept.
      const existing = accounts.find(value => value.id === signedIn.id)
        ?? accounts.find(value => !value.refreshToken && (!value.email || value.email === signedIn.email))
      const account: ClaudeAccount = existing
        ? { ...signedIn, id: existing.id, displayName: existing.displayName, showInOverview: existing.showInOverview }
        : signedIn
      await storageService.saveAccount('claude', account)
      return { success: true, account }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('claude:cancel-login', () => {
    return claudeService.cancelLogin()
  })

  ipcMain.handle('claude:fetch-all-usage', fetchAllClaudeUsage)
}
