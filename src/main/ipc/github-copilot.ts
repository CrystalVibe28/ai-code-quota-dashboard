import { ipcMain } from 'electron'
import { GithubCopilotService } from '../services/providers/github-copilot'
import { StorageService } from '../services/storage'
import { TrayService } from '../services/tray'
import { UsageDataService } from '../services/usage-data'
import type { GithubCopilotAccount, GithubCopilotAccountUsage } from '@shared/types'
import { singleFlight } from './utils/singleFlight'

const githubCopilotService = new GithubCopilotService()
const storageService = new StorageService()

async function fetchAllGithubCopilotUsageInner(): Promise<GithubCopilotAccountUsage[]> {
  const startedAt = Date.now()
  try {
    const accounts = await storageService.getAccounts('githubCopilot') as GithubCopilotAccount[]

    const results = await Promise.all(
      accounts.map(async (account): Promise<GithubCopilotAccountUsage> => {
        try {
          const usage = await githubCopilotService.fetchUsage(account.accessToken)
          return { accountId: account.id, name: account.name, login: account.login, usage }
        } catch (error) {
          console.error('[GitHub Copilot] fetch-usage error for', account.login, ':', error)
          return { accountId: account.id, name: account.name, login: account.login, usage: null, error: String(error) }
        }
      })
    )

    const activeResults = UsageDataService.getInstance()
      .recordProvider('githubCopilot', results, Date.now(), startedAt)
    try {
      const trayData = activeResults
        .filter(r => r.usage !== null)
        .map(r => ({ name: r.name, percent: 0 }))
      TrayService.getInstance().triggerUpdate({ githubCopilot: trayData })
    } catch (error) {
      console.error('[GitHub Copilot] Failed to update tray:', error)
    }

    return activeResults
  } catch (error) {
    console.error('[GitHub Copilot IPC] Failed to fetch all usage:', error)
    UsageDataService.getInstance().recordProviderFailure('githubCopilot', Date.now(), startedAt)
    return []
  }
}

export const fetchAllGithubCopilotUsage = singleFlight(fetchAllGithubCopilotUsageInner)

export function registerGithubCopilotHandlers(): void {
  ipcMain.handle('github-copilot:login', async () => {
    try {
      const result = await githubCopilotService.login()
      if (result.success && result.account) {
        await storageService.saveAccount('githubCopilot', result.account as GithubCopilotAccount)
      }
      return result
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('github-copilot:cancel-login', () => {
    return githubCopilotService.cancelLogin()
  })

  ipcMain.handle('github-copilot:refresh-token', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('githubCopilot') as GithubCopilotAccount[]
      const account = accounts.find(a => a.id === accountId)
      if (!account) {
        return false
      }

      const newTokens = await githubCopilotService.refreshToken(account.refreshToken)
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
      const accounts = await storageService.getAccounts('githubCopilot') as GithubCopilotAccount[]
      const account = accounts.find(a => a.id === accountId)
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

  ipcMain.handle('github-copilot:fetch-all-usage', fetchAllGithubCopilotUsage)
}
