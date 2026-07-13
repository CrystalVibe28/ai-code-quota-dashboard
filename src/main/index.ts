import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { existsSync, rmSync, readdirSync } from 'fs'
import { join as pathJoin } from 'path'
import { TrayService } from './services/tray'
import { StorageService } from './services/storage'
import { CryptoService } from './services/crypto'
import { NotificationService } from './services/notification'
import { AntigravityService } from './services/providers/antigravity'
import { GithubCopilotService } from './services/providers/github-copilot'
import { ZaiCodingService } from './services/providers/zai-coding'
import { CodexService } from './services/providers/codex'
import { OpencodeGoService } from './services/providers/opencode-go'

import { registerAuthHandlers } from './ipc/auth'
import { registerStorageHandlers } from './ipc/storage'
import { registerAntigravityHandlers } from './ipc/antigravity'
import { registerGithubCopilotHandlers } from './ipc/github-copilot'
import { registerZaiCodingHandlers } from './ipc/zai-coding'
import { registerCodexHandlers } from './ipc/codex'
import { registerOpencodeGoHandlers } from './ipc/opencode-go'
import { registerAppHandlers } from './ipc/app'
import { registerNotificationHandlers } from './ipc/notification'
import { registerUpdateHandlers, notifyUpdateAvailable } from './ipc/update'

let mainWindow: BrowserWindow | null = null
let isQuitting = false
const cryptoService = new CryptoService()

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
    const isAutoLaunch = process.argv.includes('--hidden')
    const hasPassword = cryptoService.hasPassword()
    const isPasswordSkipped = cryptoService.isPasswordSkipped()

    // Auto-unlock storage if password was skipped
    if (hasPassword && isPasswordSkipped) {
      const storageService = new StorageService()
      storageService.unlock(cryptoService.getSkippedPasswordKey())
    }

    // Decide whether to show the window:
    // Hide ONLY when: auto-launched AND no real password (skipped or no password file)
    const hasRealPassword = hasPassword && !isPasswordSkipped
    const shouldHide = isAutoLaunch && !hasRealPassword

    if (shouldHide) {
      // Auto-start without real password → minimize to tray, background refresh only
      console.log('[Startup] Auto-launched without password - hiding to tray')
      startBackgroundRefresh()
    } else {
      // All other cases → show foreground window
      console.log('[Startup] Showing main window', { isAutoLaunch, hasPassword, isPasswordSkipped })
      mainWindow?.show()
      startBackgroundRefresh()
    }
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
    // Wait for an in-flight background refresh before the renderer starts one.
    void (backgroundRefreshPromise ?? Promise.resolve()).finally(() => {
      mainWindow?.webContents.send('app:refresh-all')
    })
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
    // Wait for an in-flight background refresh before the renderer starts one.
    void (backgroundRefreshPromise ?? Promise.resolve()).finally(() => {
      mainWindow?.webContents.send('app:refresh-all')
    })
  })
}

function registerAllIpcHandlers(): void {
  registerAuthHandlers()
  registerStorageHandlers()
  registerAntigravityHandlers()
  registerGithubCopilotHandlers()
  registerZaiCodingHandlers()
  registerCodexHandlers()
  registerOpencodeGoHandlers()
  registerAppHandlers()
  registerNotificationHandlers()
  registerUpdateHandlers()
}

const trayService = TrayService.getInstance()
const notificationService = NotificationService.getInstance()

let refreshTimer: NodeJS.Timeout | null = null
let backgroundRefreshPromise: Promise<void> | null = null

// Single instance lock to prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, show and focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('app:navigate-to-overview')
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
  if (backgroundRefreshPromise) return backgroundRefreshPromise

  let refresh!: Promise<void>
  refresh = performBackgroundRefreshInner().finally(() => {
    if (backgroundRefreshPromise === refresh) backgroundRefreshPromise = null
  })
  backgroundRefreshPromise = refresh
  return refresh
}

async function performBackgroundRefreshInner(): Promise<void> {
  try {
    const refreshStorageService = new StorageService()
    if (!refreshStorageService.isUnlocked()) return

    const refreshSettings = await refreshStorageService.getSettings()
    const customization = await refreshStorageService.getCustomization()

    const antigravityService = new AntigravityService()
    const githubCopilotService = new GithubCopilotService()
    const zaiCodingService = new ZaiCodingService()
    const codexService = new CodexService()
    const opencodeGoService = new OpencodeGoService()

    const [antigravityResults, copilotResults, zaiResults, codexResults, opencodeGoResults] = await Promise.all([
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
          console.error('[Background Refresh] Zai Coding Plan fetch failed:', error)
          return []
        }
      })(),
      (async () => {
        try {
          const accounts = await refreshStorageService.getAccounts('codex')
          return Promise.all(
            accounts.map(async (account: any) => {
              try {
                let currentAccount = account
                if (Date.now() > account.expiresAt - 300000) {
                  const newTokens = await codexService.refreshToken(account.refreshToken)
                  if (newTokens) {
                    await refreshStorageService.updateAccount('codex', account.id, {
                      accessToken: newTokens.accessToken,
                      refreshToken: newTokens.refreshToken,
                      idToken: newTokens.idToken,
                      expiresAt: newTokens.expiresAt,
                      accountId: newTokens.accountId,
                      organizationId: newTokens.organizationId,
                      planType: newTokens.planType
                    })
                    currentAccount = { ...account, ...newTokens }
                  } else {
                    return { accountId: account.id, name: account.displayName, email: account.email, usage: null, error: 'Token refresh failed' }
                  }
                }
                const usage = await codexService.fetchUsage(currentAccount)
                return { accountId: account.id, name: account.displayName, email: account.email, usage }
              } catch (error) {
                return { accountId: account.id, name: account.displayName, email: account.email, usage: null, error: String(error) }
              }
            })
          )
        } catch (error) {
          console.error('[Background Refresh] Codex fetch failed:', error)
          return []
        }
      })(),
      (async () => {
        try {
          const accounts = await refreshStorageService.getAccounts('opencodeGo')
          return Promise.all(
            accounts.map(async (account: any) => {
              try {
                let currentAccount = account
                if (Date.now() > account.expiresAt - 300000) {
                  const refreshed = await opencodeGoService.refreshCookies(account)
                  if (refreshed) {
                    await refreshStorageService.updateAccount('opencodeGo', account.id, refreshed)
                    currentAccount = { ...account, ...refreshed }
                  }
                }
                const usage = await opencodeGoService.fetchUsage(currentAccount)
                return { accountId: account.id, name: account.displayName, workspaceId: account.workspaceId, usage }
              } catch (error) {
                return { accountId: account.id, name: account.displayName, workspaceId: account.workspaceId, usage: null, error: String(error) }
              }
            })
          )
        } catch (error) {
          console.error('[Background Refresh] Opencode Go fetch failed:', error)
          return []
        }
      })()
    ])

    const antigravityTray = antigravityResults
      .filter((r: any) => r.usage?.length > 0)
      .map((r: any) => ({
        name: r.email,
        percent: Math.round(Math.min(...r.usage.map((quota: any) => quota.remainingFraction)) * 100)
      }))
    const copilotTray = copilotResults
      .filter((r: any) => r.usage !== null)
      .map((r: any) => ({ name: r.name, percent: r.usage?.percent || 0 }))
    const zaiTray = zaiResults
      .filter((r: any) => r.usage !== null)
      .map((r: any) => ({ name: r.name, percent: r.usage?.percent || 0 }))
    const codexTray = codexResults
      .filter((r: any) => r.usage !== null)
      .map((r: any) => ({ name: r.name, percent: 0 }))
    const opencodeGoTray = opencodeGoResults
      .filter((r: any) => r.usage !== null)
      .map((r: any) => ({
        name: r.name,
        percent: Math.round(
          (r.usage?.limits?.length ?? 0) > 0
            ? Math.min(...r.usage.limits.map((limit: any) => limit.remaining))
            : 0
        )
      }))

    trayService.triggerUpdate({
      antigravity: antigravityTray,
      githubCopilot: copilotTray,
      zaiCoding: zaiTray,
      codex: codexTray,
      opencodeGo: opencodeGoTray
    })

    notificationService.checkAndNotify(
      antigravityResults,
      copilotResults,
      zaiResults,
      codexResults,
      opencodeGoResults,
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

  trayService.createTray()

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

  // Check for updates after 10 seconds, then every 24 hours
  setTimeout(() => {
    notifyUpdateAvailable(mainWindow)
  }, 10000)

  setInterval(
    () => {
      notifyUpdateAvailable(mainWindow)
    },
    24 * 60 * 60 * 1000
  ) // 24 hours
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

