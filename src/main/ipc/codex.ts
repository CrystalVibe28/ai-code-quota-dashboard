import { ipcMain } from 'electron'
import { CodexService } from '../services/providers/codex'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import type { CodexAccount, CodexAccountUsage } from '@shared/types'
import { withAutoRefreshCodex } from './utils/withAutoRefreshCodex'

const codexService = new CodexService()
const storageService = new StorageService()

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

      const newTokens = await codexService.refreshToken(account.refreshToken)
      if (newTokens) {
        await storageService.updateAccount('codex', accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          idToken: newTokens.idToken,
          expiresAt: newTokens.expiresAt,
          accountId: newTokens.accountId,
          organizationId: newTokens.organizationId,
          planType: newTokens.planType
        })
        return true
      }
      return false
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

  ipcMain.handle('codex:fetch-all-usage', async (): Promise<CodexAccountUsage[]> => {
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

      const trayService = TrayService.getInstance()
      const trayData = results
        .filter(r => r.usage !== null)
        .map(r => ({ name: r.name, percent: 0 }))
      trayService.triggerUpdate({ codex: trayData })

      return results
    } catch (error) {
      console.error('[Codex] fetch-all-usage error:', error)
      return []
    }
  })
}
