import { ipcMain, app } from 'electron'
import { StorageService } from '../services/storage'
import { restartBackgroundRefresh, stopBackgroundRefresh, startBackgroundRefresh } from '../index'

const storageService = new StorageService()

export function registerAppHandlers(): void {
  ipcMain.handle('app:get-close-to-tray', async () => {
    try {
      const settings = await storageService.getSettings()
      return settings.closeToTray || false
    } catch (error) {
      console.error('[App IPC] Failed to get closeToTray setting:', error)
      return false
    }
  })

  ipcMain.handle('app:set-close-to-tray', async (_, value: boolean) => {
    try {
      await storageService.saveSettings({ closeToTray: value })

      restartBackgroundRefresh()
      return true
    } catch (error) {
      console.error('[App IPC] Failed to set closeToTray:', error)
      return false
    }
  })

  ipcMain.handle('app:refresh-interval-changed', async () => {
    try {
      restartBackgroundRefresh()
      return true
    } catch (error) {
      console.error('[App IPC] Failed to restart background refresh:', error)
      return false
    }
  })

  ipcMain.handle('app:stop-background-refresh', async () => {
    try {
      stopBackgroundRefresh()
      return true
    } catch (error) {
      console.error('[App IPC] Failed to stop background refresh:', error)
      return false
    }
  })

  ipcMain.handle('app:start-background-refresh', async () => {
    try {
      startBackgroundRefresh()
      return true
    } catch (error) {
      console.error('[App IPC] Failed to start background refresh:', error)
      return false
    }
  })

  ipcMain.handle('app:navigate-to-overview', async () => {
    return true
  })

  ipcMain.handle('app:refresh-all', async () => {
    return true
  })

  // Auto launch (Windows only)
  ipcMain.handle('app:get-platform', () => {
    return process.platform
  })

  ipcMain.handle('app:get-auto-launch', () => {
    try {
      const settings = app.getLoginItemSettings()
      return settings.openAtLogin
    } catch (error) {
      console.error('[App IPC] Failed to get auto launch setting:', error)
      return false
    }
  })

  ipcMain.handle('app:set-auto-launch', (_, enabled: boolean) => {
    try {
      app.setLoginItemSettings({ openAtLogin: enabled })
      return true
    } catch (error) {
      console.error('[App IPC] Failed to set auto launch:', error)
      return false
    }
  })
}
