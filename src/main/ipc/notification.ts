import { ipcMain } from 'electron'
import { NotificationService } from '../services/notification'
import { restartBackgroundRefresh } from '../index'

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
}
