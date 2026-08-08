import { app, shell, BrowserWindow, powerMonitor } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { existsSync, rmSync, readdirSync } from 'fs'
import { TrayService } from './services/tray'
import { StorageService } from './services/storage'
import { CryptoService } from './services/crypto'
import { NotificationService } from './services/notification'
import { getLocalApiHost, LocalApiService, USAGE_API_PATH } from './services/local-api'
import type { UsageSnapshot } from '@shared/types'

import { registerAuthHandlers, unlockWithSkippedPassword } from './ipc/auth'
import { registerStorageHandlers } from './ipc/storage'
import { fetchAllAntigravityUsage, registerAntigravityHandlers } from './ipc/antigravity'
import { fetchAllGithubCopilotUsage, registerGithubCopilotHandlers } from './ipc/github-copilot'
import { fetchAllZaiCodingUsage, registerZaiCodingHandlers } from './ipc/zai-coding'
import { fetchAllAiStudioUsage, registerAiStudioHandlers } from './ipc/ai-studio'
import { fetchAllCodexUsage, registerCodexHandlers } from './ipc/codex'
import { fetchAllOpencodeGoUsage, registerOpencodeGoHandlers } from './ipc/opencode-go'
import { fetchAllOllamaCloudUsage, registerOllamaCloudHandlers } from './ipc/ollama-cloud'
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

function createWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow

  const window = new BrowserWindow({
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

  mainWindow = window
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  trayService.setMainWindow(window)
  notificationService.setMainWindow(window)

  window.on('close', (event) => {
    if (isQuitting) return

    try {
      const storageService = new StorageService()
      const settings = storageService.getSettings()

      if (settings.closeToTray) {
        event.preventDefault()
        window.hide()
      }
    } catch (error) {
      console.error('[Window] Failed to check closeToTray setting:', error)
    }
  })

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null
      trayService.setMainWindow(null)
      notificationService.setMainWindow(null)
    }
    if (!isQuitting && process.platform !== 'darwin') app.quit()
  })

  return window
}

function showMainWindow(): BrowserWindow {
  const window = createWindow()
  const show = (): void => {
    if (window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }

  if (window.webContents.isLoading()) {
    window.once('ready-to-show', show)
  } else {
    show()
  }
  return window
}

function showOverview(): void {
  const window = showMainWindow()
  const send = (): void => window.webContents.send('app:navigate-to-overview')
  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', send)
  } else {
    send()
  }
}

function registerAllIpcHandlers(): void {
  registerAuthHandlers(restartLocalApi)
  registerStorageHandlers(restartLocalApi)
  registerAntigravityHandlers()
  registerGithubCopilotHandlers()
  registerZaiCodingHandlers()
  registerAiStudioHandlers()
  registerCodexHandlers()
  registerOpencodeGoHandlers()
  registerOllamaCloudHandlers()
  registerAppHandlers()
  registerNotificationHandlers()
  registerUpdateHandlers((installing) => {
    isQuitting = installing
  })
}

const trayService = TrayService.getInstance()
const notificationService = NotificationService.getInstance()
let localApiService = new LocalApiService()

function getConfiguredLocalApiHost(): string {
  try {
    return getLocalApiHost(new StorageService().getSettings().allowRemoteApiAccess === true)
  } catch {
    return getLocalApiHost(false)
  }
}

export async function restartLocalApi(): Promise<void> {
  try {
    const host = getConfiguredLocalApiHost()
    await localApiService.stop()
    localApiService = new LocalApiService({ host })
    const port = await localApiService.start()
    console.log(`[Local API] Listening on http://${host}:${port}${USAGE_API_PATH}`)
  } catch (error) {
    console.error('[Local API] Failed to restart:', error)
  }
}

let refreshTimer: NodeJS.Timeout | null = null
let backgroundRefreshPromise: Promise<void> | null = null

// Single instance lock to prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_, commandLine) => {
    if (!commandLine.includes('--hidden')) showOverview()
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
    const [
      antigravity,
      githubCopilot,
      zaiCoding,
      codex,
      opencodeGo,
      ollamaCloud,
      aiStudio
    ] = await Promise.all([
      fetchAllAntigravityUsage(),
      fetchAllGithubCopilotUsage(),
      fetchAllZaiCodingUsage(),
      fetchAllCodexUsage(),
      fetchAllOpencodeGoUsage(),
      fetchAllOllamaCloudUsage(),
      fetchAllAiStudioUsage()
    ])
    const snapshot: UsageSnapshot = {
      updatedAt: Date.now(),
      antigravity,
      githubCopilot,
      zaiCoding,
      codex,
      opencodeGo,
      ollamaCloud,
      aiStudio
    }

    mainWindow?.webContents.send('app:usage-updated', snapshot)
    trayService.notifyDataChanged()

    notificationService.checkAndNotify(
      antigravity,
      githubCopilot,
      zaiCoding,
      codex,
      opencodeGo,
      refreshSettings,
      {
        hideUnlimitedQuota: customization?.global?.hideUnlimitedQuota ?? false,
        cards: customization?.cards ?? {},
        providers: customization?.providers ?? {}
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

    const settings = storageService.getSettings()
    const intervalMs = settings.refreshInterval * 1000

    if (refreshTimer) {
      clearInterval(refreshTimer)
    }

    refreshTimer = setInterval(performBackgroundRefresh, intervalMs)
  } catch (error) {
    console.error('[Auto Refresh] Failed to start refresh timer:', error)
  }
}

export async function restartBackgroundRefresh(): Promise<void> {
  await startBackgroundRefresh()
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
  stopBackgroundRefresh()
  void localApiService.stop().catch(error => {
    console.error('[Local API] Failed to stop:', error)
  })
})

app.whenReady().then(async () => {
  cleanCorruptedCache()

  electronApp.setAppUserModelId('com.aimanager.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerAllIpcHandlers()
  trayService.configure({
    openMainWindow: showMainWindow,
    refreshUsage: performBackgroundRefresh
  })
  notificationService.setOpenMainWindow(showMainWindow)
  trayService.createTray()

  const isAutoLaunch = process.argv.includes('--hidden')
  const hasPassword = cryptoService.hasPassword()
  const isPasswordSkipped = cryptoService.isPasswordSkipped()
  const unlockResult = hasPassword && isPasswordSkipped
    ? unlockWithSkippedPassword()
    : null
  const isUpdateRequired = unlockResult?.success === false &&
    unlockResult.reason === 'data-version-too-new'
  const hasRealPassword = hasPassword && !isPasswordSkipped
  const shouldShowMainWindow = !isAutoLaunch || hasRealPassword || isUpdateRequired

  if (unlockResult?.success) void startBackgroundRefresh()
  await restartLocalApi()
  if (shouldShowMainWindow) {
    console.log('[Startup] Showing main window', { isAutoLaunch, hasPassword, isPasswordSkipped })
    showMainWindow()
  } else {
    console.log('[Startup] Started in tray without creating the main window')
  }

  app.on('activate', function () {
    showMainWindow()
  })

  powerMonitor.on('resume', () => {
    void restartBackgroundRefresh()
  })

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

