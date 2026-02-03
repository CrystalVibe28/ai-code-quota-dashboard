import { ipcMain, shell, BrowserWindow } from 'electron'
import { UpdateService } from '../services/update'

const updateService = UpdateService.getInstance()

export function registerUpdateHandlers(): void {
  // Check for updates
  ipcMain.handle('update:check', async () => {
    try {
      const result = await updateService.checkForUpdate()
      return result
    } catch (error) {
      console.error('[Update IPC] Failed to check for updates:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  })

  // Get current version
  ipcMain.handle('update:get-current-version', () => {
    return updateService.getCurrentVersion()
  })

  // Get skipped version
  ipcMain.handle('update:get-skipped-version', () => {
    return updateService.getSkippedVersion()
  })

  // Set skipped version (don't remind for this version)
  ipcMain.handle('update:skip-version', (_, version: string) => {
    try {
      updateService.setSkippedVersion(version)
      console.log(`[Update IPC] Skipped version set to: ${version}`)
      return true
    } catch (error) {
      console.error('[Update IPC] Failed to set skipped version:', error)
      return false
    }
  })

  // Clear skipped version
  ipcMain.handle('update:clear-skipped-version', () => {
    try {
      updateService.clearSkippedVersion()
      return true
    } catch (error) {
      console.error('[Update IPC] Failed to clear skipped version:', error)
      return false
    }
  })

  // Get last checked time
  ipcMain.handle('update:get-last-checked', () => {
    return updateService.getLastChecked()
  })

  // Open release page in browser
  ipcMain.handle('update:open-release-page', async (_, url?: string) => {
    try {
      const releaseUrl = url || updateService.getReleaseUrl()
      await shell.openExternal(releaseUrl)
      return true
    } catch (error) {
      console.error('[Update IPC] Failed to open release page:', error)
      return false
    }
  })
}

/**
 * Send update available notification to renderer
 */
export function notifyUpdateAvailable(mainWindow: BrowserWindow | null): void {
  if (!mainWindow) return

  const updateService = UpdateService.getInstance()

  updateService.checkForUpdate().then((result) => {
    if (result.success && result.data?.hasUpdate) {
      const { latestVersion } = result.data
      // Check if user has skipped this version
      if (updateService.shouldNotifyForVersion(latestVersion)) {
        mainWindow.webContents.send('update:available', result.data)
        console.log(`[Update IPC] Notified renderer about update: v${latestVersion}`)
      } else {
        console.log(`[Update IPC] Update v${latestVersion} skipped by user preference`)
      }
    }
  })
}
