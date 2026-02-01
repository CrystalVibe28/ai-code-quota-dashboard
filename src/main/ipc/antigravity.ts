import { ipcMain } from 'electron'
import { AntigravityService } from '../services/providers/antigravity'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import type { AntigravityAccount, AntigravityUsage } from '@shared/types'

const antigravityService = new AntigravityService()
const storageService = new StorageService()

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
      let account = accounts.find(a => a.id === accountId)
      if (!account) return null

      // Auto-refresh if token is expired or expiring soon
      if (Date.now() > account.expiresAt - 300000) {
        const newTokens = await antigravityService.refreshToken(account.refreshToken)
        if (newTokens) {
          await storageService.updateAccount('antigravity', accountId, {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            expiresAt: newTokens.expiresAt
          })
          account = { ...account, ...newTokens }
        } else {
          console.error('[Antigravity] Failed to refresh token for', account.email)
          return null
        }
      }

      return await antigravityService.fetchUsage(account)
    } catch (error) {
      console.error('[Antigravity] fetch-usage error:', error)
      return null
    }
  })

  ipcMain.handle('antigravity:fetch-all-usage', async (): Promise<AntigravityUsage[]> => {
    try {
      const accounts = await storageService.getAccounts('antigravity') as AntigravityAccount[]
      const results = await Promise.all(
        accounts.map(async (account): Promise<AntigravityUsage> => {
          try {
            // Auto-refresh if token is expired or expiring soon
            let currentAccount = account
            if (Date.now() > account.expiresAt - 300000) {
              const newTokens = await antigravityService.refreshToken(account.refreshToken)
              if (newTokens) {
                await storageService.updateAccount('antigravity', account.id, {
                  accessToken: newTokens.accessToken,
                  refreshToken: newTokens.refreshToken,
                  expiresAt: newTokens.expiresAt
                })
                currentAccount = { ...account, ...newTokens }
              } else {
                console.error('[Antigravity] Failed to refresh token for', account.email)
                return { accountId: account.id, name: account.name, usage: null, error: 'Token refresh failed' }
              }
            }

            const usage = await antigravityService.fetchUsage(currentAccount)
            return { accountId: account.id, name: account.name, usage }
          } catch (error) {
            console.error('[Antigravity] fetch-all-usage error for', account.email, ':', error)
            return { accountId: account.id, name: account.name, usage: null, error: String(error) }
          }
        })
      )

      const trayService = TrayService.getInstance()
      const trayData = results
        .filter(r => r.usage !== null)
        .map(r => ({ name: r.name, percent: 0 })) // Note: percent calculation would need usage data
      trayService.triggerUpdate({ antigravity: trayData })

      return results
    } catch (error) {
      console.error('[Antigravity] fetch-all-usage error:', error)
      return []
    }
  })
}
