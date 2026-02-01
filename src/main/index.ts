import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { existsSync, rmSync, readdirSync } from 'fs'
import { join as pathJoin } from 'path'
import { TrayService } from './services/tray'
import { StorageService } from './services/storage'
import { NotificationService } from './services/notification'
import { AntigravityService } from './services/providers/antigravity'
import { GithubCopilotService } from './services/providers/github-copilot'
import { ZaiCodingService } from './services/providers/zai-coding'

import { registerAuthHandlers } from './ipc/auth'
import { registerStorageHandlers } from './ipc/storage'
import { registerAntigravityHandlers } from './ipc/antigravity'
import { registerGithubCopilotHandlers } from './ipc/github-copilot'
import { registerZaiCodingHandlers } from './ipc/zai-coding'
import { registerAppHandlers } from './ipc/app'
import { registerNotificationHandlers } from './ipc/notification'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

function getIconPath(): string {
  if (is.dev) {
    return join(__dirname, '../../resources/icon.png')
  } else {
    return join(process.resourcesPath, 'icon.png')
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hiddenInset',
    frame: true,
    icon: getIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  trayService.setMainWindow(mainWindow)
  notificationService.setMainWindow(mainWindow)

  mainWindow.on('close', async (event) => {
    if (isQuitting) {
      return // Allow quit
    }

    try {
      const storageService = new StorageService()
      const settings = await storageService.getSettings()

      if (settings.closeToTray) {
        event.preventDefault()
        mainWindow?.hide()

        // Create tray if not exists
        trayService.createTray()
      }
    } catch (error) {
      console.error('[Window] Failed to check closeToTray setting:', error)
    }
  })

  mainWindow.on('show', () => {
    console.log('[Window State] Window shown - stopping background refresh')
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  })

  mainWindow.on('hide', () => {
    console.log('[Window State] Window hidden - starting background refresh')
    startBackgroundRefresh()
  })

  mainWindow.on('minimize', () => {
    console.log('[Window State] Window minimized - starting background refresh')
    startBackgroundRefresh()
  })

  mainWindow.on('restore', () => {
    console.log('[Window State] Window restored - stopping background refresh')
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  })
}

function registerAllIpcHandlers(): void {
  registerAuthHandlers()
  registerStorageHandlers()
  registerAntigravityHandlers()
  registerGithubCopilotHandlers()
  registerZaiCodingHandlers()
  registerAppHandlers()
  registerNotificationHandlers()
}

const trayService = TrayService.getInstance()
const notificationService = NotificationService.getInstance()

let refreshTimer: NodeJS.Timeout | null = null

// Single instance lock to prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Configure Chromium to avoid cache issues
app.commandLine.appendSwitch('disable-dev-shm-usage')
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-setuid-sandbox')

// Set up separate cache directory for this app
const userDataPath = app.getPath('userData')
const cachePath = join(userDataPath, 'Cache')
app.commandLine.appendSwitch('disk-cache-dir', cachePath)

// Disable GPU disk cache only (keep GPU acceleration enabled)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.commandLine.appendSwitch('disable-gpu-program-cache')

// Clean corrupted cache on startup
function cleanCorruptedCache(): void {
  try {
    const gpuCacheDir = join(userDataPath, 'GPUCache')
    const shaderCacheDir = join(userDataPath, 'ShaderCache')

    if (existsSync(gpuCacheDir)) {
      const files = readdirSync(gpuCacheDir)
      if (files.length > 100) {
        // Too many files might indicate corruption
        try {
          rmSync(gpuCacheDir, { recursive: true, force: true })
        } catch (error) {
          console.error('[Cleanup] Failed to remove GPU cache:', error)
        }
      }
    }

    if (existsSync(shaderCacheDir)) {
      try {
        rmSync(shaderCacheDir, { recursive: true, force: true })
      } catch (error) {
        console.error('[Cleanup] Failed to remove shader cache:', error)
      }
    }
  } catch (error) {
    console.error('[Cleanup] Cache cleanup failed:', error)
  }
}

async function performBackgroundRefresh(): Promise<void> {
  try {
    const refreshStorageService = new StorageService()
    if (!refreshStorageService.isUnlocked()) return

    const refreshSettings = await refreshStorageService.getSettings()
    const customization = await refreshStorageService.getCustomization()

    const antigravityService = new AntigravityService()
    const githubCopilotService = new GithubCopilotService()
    const zaiCodingService = new ZaiCodingService()

    const [antigravityResults, copilotResults, zaiResults] = await Promise.all([
      (async () => {
        try {
          const accounts = await refreshStorageService.getAccounts('antigravity')
          return Promise.all(
            accounts.map(async (account: any) => {
              try {
                let currentAccount = account
                if (Date.now() > account.expiresAt - 300000) {
                  const newTokens = await antigravityService.refreshToken(account.refreshToken)
                  if (newTokens) {
                    await refreshStorageService.updateAccount('antigravity', account.id, {
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
        } catch (error) {
          console.error('[Background Refresh] Antigravity fetch failed:', error)
          return []
        }
      })(),
      (async () => {
        try {
          const accounts = await refreshStorageService.getAccounts('githubCopilot')
          return Promise.all(
            accounts.map(async (account: any) => {
              const usage = await githubCopilotService.fetchUsage(account.accessToken)
              return { accountId: account.id, name: account.name, login: account.login, usage }
            })
          )
        } catch (error) {
          console.error('[Background Refresh] GitHub Copilot fetch failed:', error)
          return []
        }
      })(),
      (async () => {
        try {
          const accounts = await refreshStorageService.getAccounts('zaiCoding')
          return Promise.all(
            accounts.map(async (account: any) => {
              const usage = await zaiCodingService.fetchUsage(account.apiKey)
              return { accountId: account.id, name: account.name, usage }
            })
          )
        } catch (error) {
          console.error('[Background Refresh] Z.ai Coding fetch failed:', error)
          return []
        }
      })()
    ])

    const antigravityTray = antigravityResults
      .filter((r: any) => r.usage !== null)
      .map((r: any) => ({ name: r.email, percent: r.usage?.percent || 0 }))
    const copilotTray = copilotResults
      .filter((r: any) => r.usage !== null)
      .map((r: any) => ({ name: r.name, percent: r.usage?.percent || 0 }))
    const zaiTray = zaiResults
      .filter((r: any) => r.usage !== null)
      .map((r: any) => ({ name: r.name, percent: r.usage?.percent || 0 }))

    trayService.triggerUpdate({
      antigravity: antigravityTray,
      githubCopilot: copilotTray,
      zaiCoding: zaiTray
    })

notificationService.checkAndNotify(
      antigravityResults,
      copilotResults,
      zaiResults,
      refreshSettings,
      {
        hideUnlimitedQuota: customization?.global?.hideUnlimitedQuota ?? false,
        hiddenCardIds: new Set(
          Object.entries(customization?.cards ?? {})
            .filter(([, config]) => config.visible === false)
            .map(([cardId]) => cardId)
        )
      }
    )
  } catch (error) {
    console.error('[Background Refresh] Check and notify failed:', error)
  }
}

async function startBackgroundRefresh(): Promise<void> {
  try {
    const storageService = new StorageService()
    if (!storageService.isUnlocked()) {
      return
    }

    const settings = await storageService.getSettings()
    const intervalMs = settings.refreshInterval * 1000

    if (refreshTimer) {
      clearInterval(refreshTimer)
    }

    // Start background refresh only when window is not visible (hidden or minimized)
    // This prevents duplicate refresh timers when foreground and background would both run
    if (!mainWindow || mainWindow.isMinimized() || !mainWindow.isVisible()) {
      refreshTimer = setInterval(performBackgroundRefresh, intervalMs)
    } else {
      refreshTimer = null
    }
  } catch (error) {
    console.error('[Background Refresh] Failed to start background refresh:', error)
  }
}

export function restartBackgroundRefresh(): void {
  startBackgroundRefresh()
}

export function stopBackgroundRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

export { startBackgroundRefresh }

// Handle quit properly
app.on('before-quit', () => {
  isQuitting = true
})

app.whenReady().then(() => {
  cleanCorruptedCache()

  electronApp.setAppUserModelId('com.aimanager.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerAllIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else if (mainWindow) {
      mainWindow.show()
    }
  })

  startBackgroundRefresh()

  setTimeout(async () => {
    await performBackgroundRefresh()
  }, 5000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

