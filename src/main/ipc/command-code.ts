import { ipcMain } from 'electron'
import type {
  CommandCodeAccount,
  CommandCodeAccountUsage,
  CommandCodeUsage
} from '@shared/types'
import { CommandCodeService } from '../services/providers/command-code'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import { UsageDataService } from '../services/usage-data'
import { singleFlight } from './utils/singleFlight'

const commandCodeService = new CommandCodeService()
const storageService = new StorageService()

function getTrayPercent(usage: CommandCodeUsage): number {
  if (usage.limits.length === 0) return 0
  return Math.round(Math.min(...usage.limits.map(limit => 100 - limit.percentage)))
}

async function fetchAllCommandCodeUsageInner(): Promise<CommandCodeAccountUsage[]> {
  const startedAt = Date.now()
  try {
    const accounts = await storageService.getAccounts('commandCode') as CommandCodeAccount[]
    const results = await Promise.all(accounts.map(async (account): Promise<CommandCodeAccountUsage> => {
      try {
        const usage = await commandCodeService.fetchUsage(account.apiKey)
        return { accountId: account.id, name: account.displayName, usage }
      } catch (error) {
        console.error('[Command Code] fetch-all-usage error for', account.displayName, ':', error)
        return {
          accountId: account.id,
          name: account.displayName,
          usage: null,
          error: String(error)
        }
      }
    }))

    const activeResults = UsageDataService.getInstance()
      .recordProvider('commandCode', results, Date.now(), startedAt)
    try {
      const trayData = activeResults
        .filter((result): result is CommandCodeAccountUsage & { usage: CommandCodeUsage } => result.usage !== null)
        .map(result => ({ name: result.name, percent: getTrayPercent(result.usage) }))
      TrayService.getInstance().triggerUpdate({ commandCode: trayData })
    } catch (error) {
      console.error('[Command Code] Failed to update tray:', error)
    }

    return activeResults
  } catch (error) {
    console.error('[Command Code] fetch-all-usage error:', error)
    UsageDataService.getInstance().recordProviderFailure('commandCode', Date.now(), startedAt)
    return []
  }
}

export const fetchAllCommandCodeUsage = singleFlight(fetchAllCommandCodeUsageInner)

export function registerCommandCodeHandlers(): void {
  ipcMain.handle('command-code:validate-api-key', async (_, apiKey: string) => {
    try {
      return await commandCodeService.validateApiKey(apiKey)
    } catch (error) {
      return { valid: false, error: String(error) }
    }
  })

  ipcMain.handle('command-code:fetch-usage', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('commandCode') as CommandCodeAccount[]
      const account = accounts.find(value => value.id === accountId)
      return account ? await commandCodeService.fetchUsage(account.apiKey) : null
    } catch (error) {
      console.error('[Command Code] fetch-usage error:', error)
      return null
    }
  })

  ipcMain.handle('command-code:fetch-all-usage', fetchAllCommandCodeUsage)
}
