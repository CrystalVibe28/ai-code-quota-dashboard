import { ipcMain } from 'electron'
import { NotificationService } from '../services/notification'
import { restartBackgroundRefresh } from '../index'
import { StorageService } from '../services/storage'
import { AntigravityService } from '../services/providers/antigravity'
import { GithubCopilotService } from '../services/providers/github-copilot'
import { ZaiCodingService } from '../services/providers/zai-coding'

const notificationService = NotificationService.getInstance()

export function registerNotificationHandlers(): void {
  ipcMain.handle('notification:reset-state', async () => {
    try {
      notificationService.resetState()
      return true
    } catch (error) {
      console.error('[Notification IPC] Failed to reset state:', error)
      return false
    }
  })

  ipcMain.handle('notification:restart-timer', async () => {
    try {
      restartBackgroundRefresh()
      return true
    } catch (error) {
      console.error('[Notification IPC] Failed to restart timer:', error)
      return false
    }
  })

  // Check and notify based on provided usage data
  ipcMain.handle('notification:check-and-notify', async (_, data: {
    antigravity: unknown[]
    copilot: unknown[]
    zai: unknown[]
  }) => {
    try {
      const storageService = new StorageService()
      if (!storageService.isUnlocked()) {
        return false
      }

      const settings = await storageService.getSettings()
      const customization = await storageService.getCustomization()

      notificationService.checkAndNotify(
        data.antigravity as any[],
        data.copilot as any[],
        data.zai as any[],
        settings,
        {
          hideUnlimitedQuota: customization?.global?.hideUnlimitedQuota ?? false,
          hiddenCardIds: new Set(
            Object.entries(customization?.cards ?? {})
              .filter(([, config]) => (config as any).visible === false)
              .map(([cardId]) => cardId)
          )
        }
      )
      return true
    } catch (error) {
      console.error('[Notification IPC] Failed to check and notify:', error)
      return false
    }
  })

  // Trigger a full refresh and notification check
  ipcMain.handle('notification:trigger-check', async () => {
    try {
      const storageService = new StorageService()
      if (!storageService.isUnlocked()) {
        return false
      }

      const settings = await storageService.getSettings()
      const customization = await storageService.getCustomization()

      const antigravityService = new AntigravityService()
      const githubCopilotService = new GithubCopilotService()
      const zaiCodingService = new ZaiCodingService()

      // Fetch all usage data
      const [antigravityResults, copilotResults, zaiResults] = await Promise.all([
        (async () => {
          try {
            const accounts = await storageService.getAccounts('antigravity')
            return Promise.all(
              accounts.map(async (account: any) => {
                try {
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
                      return { accountId: account.id, email: account.email, usage: null, error: 'Token refresh failed' }
                    }
                  }
                  const usage = await antigravityService.fetchUsage(currentAccount)
                  return { accountId: account.id, email: account.email, usage }
                } catch (error) {
                  return { accountId: account.id, email: account.email, usage: null, error: String(error) }
                }
              })
            )
          } catch {
            return []
          }
        })(),
        (async () => {
          try {
            const accounts = await storageService.getAccounts('githubCopilot')
            return Promise.all(
              accounts.map(async (account: any) => {
                const usage = await githubCopilotService.fetchUsage(account.accessToken)
                return { accountId: account.id, name: account.name, login: account.login, usage }
              })
            )
          } catch {
            return []
          }
        })(),
        (async () => {
          try {
            const accounts = await storageService.getAccounts('zaiCoding')
            return Promise.all(
              accounts.map(async (account: any) => {
                const usage = await zaiCodingService.fetchUsage(account.apiKey)
                return { accountId: account.id, name: account.name, usage }
              })
            )
          } catch {
            return []
          }
        })()
      ])

      notificationService.checkAndNotify(
        antigravityResults,
        copilotResults,
        zaiResults,
        settings,
        {
          hideUnlimitedQuota: customization?.global?.hideUnlimitedQuota ?? false,
          hiddenCardIds: new Set(
            Object.entries(customization?.cards ?? {})
              .filter(([, config]) => (config as any).visible === false)
              .map(([cardId]) => cardId)
          )
        }
      )

      return true
    } catch (error) {
      console.error('[Notification IPC] Failed to trigger check:', error)
      return false
    }
  })
}
