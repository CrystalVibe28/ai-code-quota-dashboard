import { ipcMain } from 'electron'
import { NotificationService } from '../services/notification'
import { restartBackgroundRefresh } from '../index'
import { StorageService } from '../services/storage'

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
      await restartBackgroundRefresh()
      return true
    } catch (error) {
      console.error('[Notification IPC] Failed to restart timer:', error)
      return false
    }
  })

  ipcMain.handle('notification:check-and-notify', async (_, data: {
    antigravity: unknown[]
    copilot: unknown[]
    zai: unknown[]
    codex: unknown[]
    opencodeGo?: unknown[]
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
        data.codex as any[],
        (data.opencodeGo ?? []) as any[],
        settings,
        {
          hideUnlimitedQuota: customization?.global?.hideUnlimitedQuota ?? false,
          cards: customization?.cards ?? {},
          providers: customization?.providers ?? {}
        }
      )
      return true
    } catch (error) {
      console.error('[Notification IPC] Failed to check and notify:', error)
      return false
    }
  })
}
