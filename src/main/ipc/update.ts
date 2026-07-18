import { ipcMain, shell, BrowserWindow } from 'electron'
import type { UpdateDownloadStatus } from '@shared/types/update'
import { getAutoUpdater, UpdateService } from '../services/update'

const updateService = UpdateService.getInstance()
const autoUpdater = getAutoUpdater()
let updateStatus: UpdateDownloadStatus = { state: 'idle', percent: 0 }

function setUpdateStatus(status: UpdateDownloadStatus): void {
  updateStatus = status
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('update:status', status)
  })
}

export function registerUpdateHandlers(setInstalling: (installing: boolean) => void): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('update-available', (info) => {
    setUpdateStatus({ state: 'downloading', percent: 0, version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    if (updateStatus.state !== 'downloaded' && updateStatus.state !== 'installing') {
      setUpdateStatus({ state: 'idle', percent: 0 })
    }
  })

  autoUpdater.on('download-progress', ({ percent }) => {
    setUpdateStatus({
      state: 'downloading',
      percent: Math.round(percent),
      version: updateStatus.version
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    setUpdateStatus({ state: 'downloaded', percent: 100, version: info.version })
  })

  autoUpdater.on('error', (error) => {
    console.error('[Update IPC] Auto update failed:', error)
    if (updateStatus.state !== 'downloaded' && updateStatus.state !== 'installing') {
      setUpdateStatus({
        state: 'error',
        percent: updateStatus.percent,
        version: updateStatus.version,
        error: error.message
      })
    }
  })

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

  // Get last update info
  ipcMain.handle('update:get-last-update-info', () => {
    return updateService.getLastUpdateInfo()
  })

  ipcMain.handle('update:get-status', () => updateStatus)

  ipcMain.handle('update:install', () => {
    if (updateStatus.state !== 'downloaded') return false

    try {
      setUpdateStatus({
        state: 'installing',
        percent: 100,
        version: updateStatus.version
      })
      setInstalling(true)
      autoUpdater.quitAndInstall(false, true)
      return true
    } catch (error) {
      setInstalling(false)
      console.error('[Update IPC] Failed to install update:', error)
      setUpdateStatus({
        state: 'error',
        percent: 100,
        version: updateStatus.version,
        error: String(error)
      })
      return false
    }
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
  if (!mainWindow || updateStatus.state === 'downloaded' || updateStatus.state === 'installing') return

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
