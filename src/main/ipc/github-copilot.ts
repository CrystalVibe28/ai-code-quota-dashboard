import { ipcMain } from 'electron'
import { GithubCopilotService } from '../services/providers/github-copilot'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'

const githubCopilotService = new GithubCopilotService()
const storageService = new StorageService()

export function registerGithubCopilotHandlers(): void {
  ipcMain.handle('github-copilot:login', async () => {
    try {
      const result = await githubCopilotService.login()
      if (result.success && result.account) {
        await storageService.saveAccount('githubCopilot', result.account)
      }
      return result
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('github-copilot:refresh-token', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('githubCopilot')
      const account = accounts.find((a: any) => a.id === accountId)
      if (!account) {
        return false
      }

      const newTokens = await githubCopilotService.refreshToken((account as any).refreshToken)
      if (newTokens) {
        await storageService.updateAccount('githubCopilot', accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresAt: newTokens.expiresAt
        })
        return true
      }
      return false
    } catch (error) {
      console.error('[GitHub Copilot IPC] Failed to refresh token:', error)
      return false
    }
  })

  ipcMain.handle('github-copilot:fetch-usage', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('githubCopilot')
      const account = accounts.find((a: any) => a.id === accountId) as any
      if (!account) {
        return null
      }

      const usage = await githubCopilotService.fetchUsage(account.accessToken)
      return usage
    } catch (error) {
      console.error('[GitHub Copilot IPC] Failed to fetch usage:', error)
      return null
    }
  })

  ipcMain.handle('github-copilot:fetch-all-usage', async () => {
    try {
      const accounts = await storageService.getAccounts('githubCopilot')

      const results = await Promise.all(
        accounts.map(async (account: any) => {
          try {
            const usage = await githubCopilotService.fetchUsage(account.accessToken)
            return { accountId: account.id, name: account.name, login: account.login, usage }
          } catch (error) {
            console.error('[GitHub Copilot] fetch-usage error for', account.login, ':', error)
            return { accountId: account.id, name: account.name, login: account.login, usage: null, error: String(error) }
          }
        })
      )

      const trayService = TrayService.getInstance()
      const trayData = results
        .filter((r: any) => r.usage !== null)
        .map((r: any) => ({ name: r.name, percent: r.usage?.percent || 0 }))
      trayService.triggerUpdate({ githubCopilot: trayData })

      return results
    } catch (error) {
      console.error('[GitHub Copilot IPC] Failed to fetch all usage:', error)
      return []
    }
  })
}
