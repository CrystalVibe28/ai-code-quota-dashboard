import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  screen,
  Tray,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  type Rectangle
} from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { StorageService } from './storage'
import { UsageDataService } from './usage-data'
import { getTrayPopoverPosition } from './tray-position'
import type { LocalUsageCache, ProviderId, TrayPopoverViewModel } from '@shared/types'

export interface TrayTooltipData {
  antigravity?: Array<{ name: string; percent: number }>
  githubCopilot?: Array<{ name: string; percent: number }>
  zaiCoding?: Array<{ name: string; percent: number }>
  codex?: Array<{ name: string; percent: number }>
  opencodeGo?: Array<{ name: string; percent: number }>
  ollamaCloud?: Array<{ name: string; percent: number }>
}

interface TrayActions {
  openMainWindow: () => BrowserWindow
  refreshUsage: () => Promise<void>
}

const POPOVER_SIZE = { width: 400, height: 560 }
const SINGLE_CLICK_DELAY_MS = 300
const TRAY_TITLE = 'AI Code Quota Dashboard'
const TRAY_MENU_LABELS = {
  en: {
    open: 'Open',
    refresh: 'Refresh',
    showOverview: 'Show Overview',
    quit: 'Quit'
  },
  'zh-TW': {
    open: '開啟',
    refresh: '重新整理',
    showOverview: '顯示總覽',
    quit: '結束'
  },
  'zh-CN': {
    open: '打开',
    refresh: '刷新',
    showOverview: '显示概览',
    quit: '退出'
  }
} as const

function getTrayMenuLabels(language: string) {
  return TRAY_MENU_LABELS[language as keyof typeof TRAY_MENU_LABELS] ?? TRAY_MENU_LABELS.en
}

function createEmptyCache(): LocalUsageCache {
  return {
    updatedAt: null,
    providers: {
      antigravity: [],
      githubCopilot: [],
      zaiCoding: [],
      codex: [],
      opencodeGo: [],
      ollamaCloud: [],
      aiStudio: []
    }
  }
}

export class TrayService {
  private static instance: TrayService
  private tray: Tray | null = null
  private menu: Menu | null = null
  private mainWindow: BrowserWindow | null = null
  private popoverWindow: BrowserWindow | null = null
  private popoverShouldShow = false
  private ipcRegistered = false
  private actions: TrayActions | null = null
  private clickTimer: ReturnType<typeof setTimeout> | null = null

  private constructor() {
  }

  static getInstance(): TrayService {
    if (!TrayService.instance) {
      TrayService.instance = new TrayService()
    }
    return TrayService.instance
  }

  configure(actions: TrayActions): void {
    this.actions = actions
  }

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window
  }

  private createTrayIcon(): Electron.NativeImage {
    const iconPath = is.dev
      ? join(__dirname, '../../resources/icon.png')
      : join(process.resourcesPath, 'icon.png')
    return nativeImage.createFromPath(iconPath)
  }

  createTray(): void {
    if (this.tray) return

    this.registerIpc()
    this.tray = new Tray(this.createTrayIcon())
    this.tray.setToolTip(TRAY_TITLE)
    this.tray.on('click', (_, bounds) => {
      if (this.clickTimer) clearTimeout(this.clickTimer)
      this.clickTimer = setTimeout(() => {
        this.clickTimer = null
        this.togglePopover(bounds)
      }, SINGLE_CLICK_DELAY_MS)
    })
    this.tray.on('double-click', () => {
      if (this.clickTimer) clearTimeout(this.clickTimer)
      this.clickTimer = null
      this.hidePopover()
      this.showWindow()
    })
    this.tray.on('right-click', () => {
      this.updateMenu()
      if (this.menu) this.tray?.popUpContextMenu(this.menu)
    })
    this.updateMenu()
  }

  destroyTray(): void {
    if (this.clickTimer) clearTimeout(this.clickTimer)
    this.clickTimer = null
    this.popoverShouldShow = false
    this.popoverWindow?.destroy()
    this.popoverWindow = null
    this.tray?.destroy()
    this.tray = null
  }

  notifyDataChanged(): void {
    if (this.popoverWindow?.isVisible()) {
      this.popoverWindow.webContents.send('tray:data-updated')
    }
  }

  private registerIpc(): void {
    if (this.ipcRegistered) return
    this.ipcRegistered = true

    ipcMain.handle('tray:get-view-model', event => {
      this.assertPopoverSender(event)
      return this.getViewModel()
    })
    ipcMain.on('tray:open-main', event => {
      if (!this.isPopoverSender(event)) return
      this.hidePopover()
      this.showWindow()
    })
    ipcMain.on('tray:hide', event => {
      if (this.isPopoverSender(event)) this.hidePopover()
    })
  }

  private isPopoverSender(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
    return event.sender.id === this.popoverWindow?.webContents.id
  }

  private assertPopoverSender(event: IpcMainInvokeEvent): void {
    if (!this.isPopoverSender(event)) throw new Error('Invalid tray popover sender')
  }

  private async getViewModel(): Promise<TrayPopoverViewModel> {
    const storageService = new StorageService()
    if (!storageService.isUnlocked()) {
      return {
        locked: true,
        language: 'en',
        theme: 'system',
        accentColor: 'blue',
        cache: createEmptyCache()
      }
    }

    try {
      const settings = storageService.getSettings()
      const customization = await storageService.getCustomization()
      const cache = UsageDataService.getInstance().getCachedUsage()
      await Promise.all((Object.keys(cache.providers) as ProviderId[]).map(async provider => {
        const accounts = await storageService.getAccounts(provider)
        const visibleIds = new Set(accounts.filter(account => (
          customization?.providers[provider]?.accountCardVisibility?.[account.id] ??
          account.showInOverview
        )).map(account => account.id))
        cache.providers[provider] = cache.providers[provider]
          .filter(account => visibleIds.has(account.accountId))
      }))
      return {
        locked: false,
        language: settings.language,
        theme: customization?.global.theme ?? 'system',
        accentColor: customization?.global.accentColor ?? 'blue',
        cache
      }
    } catch (error) {
      console.error('[Tray] Failed to load popover data:', error)
      return {
        locked: true,
        language: 'en',
        theme: 'system',
        accentColor: 'blue',
        cache: createEmptyCache()
      }
    }
  }

  private createPopoverWindow(): BrowserWindow {
    const window = new BrowserWindow({
      ...POPOVER_SIZE,
      show: false,
      frame: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      roundedCorners: true,
      hasShadow: true,
      backgroundColor: nativeTheme.shouldUseDarkColors ? '#292929' : '#ffffff',
      webPreferences: {
        preload: join(__dirname, '../preload/tray.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', event => event.preventDefault())
    window.on('blur', () => {
      if (!window.webContents.isDevToolsOpened()) this.hidePopover()
    })
    window.on('closed', () => {
      this.popoverWindow = null
      this.popoverShouldShow = false
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      const rendererUrl = new URL(process.env['ELECTRON_RENDERER_URL'])
      rendererUrl.searchParams.set('mode', 'tray')
      void window.loadURL(rendererUrl.toString())
    } else {
      void window.loadFile(join(__dirname, '../renderer/index.html'), {
        query: { mode: 'tray' }
      })
    }

    this.popoverWindow = window
    return window
  }

  private togglePopover(bounds: Rectangle): void {
    if (this.popoverShouldShow || this.popoverWindow?.isVisible()) {
      this.hidePopover()
      return
    }

    this.popoverShouldShow = true
    const window = this.popoverWindow ?? this.createPopoverWindow()
    const show = (): void => {
      if (!this.popoverShouldShow || window.isDestroyed()) return
      const display = screen.getDisplayMatching(bounds)
      const position = getTrayPopoverPosition(bounds, display.workArea, POPOVER_SIZE)
      window.setPosition(position.x, position.y, false)
      window.show()
      window.focus()
    }

    if (window.webContents.isLoading()) {
      window.once('ready-to-show', show)
    } else {
      show()
    }
  }

  private hidePopover(): void {
    this.popoverShouldShow = false
    this.popoverWindow?.hide()
  }

  private showWindow(navigateToOverview = false): void {
    const window = this.actions?.openMainWindow() ?? this.mainWindow
    if (!window) return
    this.mainWindow = window

    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()

    if (!navigateToOverview) return
    const send = (): void => window.webContents.send('app:navigate-to-overview')
    if (window.webContents.isLoading()) {
      window.webContents.once('did-finish-load', send)
    } else {
      send()
    }
  }

  updateMenu(): void {
    if (!this.tray) return

    const storageService = new StorageService()
    const labels = getTrayMenuLabels(
      storageService.isUnlocked() ? storageService.getSettings().language : app.getLocale()
    )
    this.menu = Menu.buildFromTemplate([
      {
        label: labels.open,
        click: () => this.showWindow()
      },
      { type: 'separator' },
      {
        label: labels.refresh,
        click: () => {
          void this.actions?.refreshUsage()
        }
      },
      {
        label: labels.showOverview,
        click: () => this.showWindow(true)
      },
      { type: 'separator' },
      {
        label: labels.quit,
        click: () => app.quit()
      }
    ])
  }

  triggerUpdate(_data: TrayTooltipData): void {
    this.tray?.setToolTip(TRAY_TITLE)
  }
}
