import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electronMock = vi.hoisted(() => ({
  browserWindowCreated: vi.fn(),
  buildMenu: vi.fn<(template: unknown[]) => object>(() => ({})),
  setToolTip: vi.fn(),
  popUpContextMenu: vi.fn(),
  ipcHandle: vi.fn(),
  ipcOn: vi.fn(),
  trayOn: vi.fn(),
  trayCreated: vi.fn(),
  templateMissing: false,
  createImage: (path: string) => ({
    path,
    isEmpty: () => electronMock.templateMissing && path.endsWith('trayTemplate.png'),
    setTemplateImage: vi.fn(),
    resize: vi.fn((size: { width: number; height: number }) => ({ path, size }))
  }),
  windowOn: vi.fn()
}))
const serviceMock = vi.hoisted(() => ({
  getAccounts: vi.fn(),
  getCachedUsage: vi.fn(),
  getCustomization: vi.fn(),
  getSettings: vi.fn(),
  isUnlocked: vi.fn()
}))

vi.mock('electron', () => ({
  app: { getLocale: vi.fn(() => 'en'), getPath: vi.fn(() => ''), quit: vi.fn() },
  ipcMain: {
    handle: electronMock.ipcHandle,
    on: electronMock.ipcOn
  },
  Menu: { buildFromTemplate: electronMock.buildMenu },
  nativeImage: { createFromPath: vi.fn((path: string) => electronMock.createImage(path)) },
  nativeTheme: { shouldUseDarkColors: false },
  screen: { getDisplayMatching: vi.fn() },
  BrowserWindow: class {
    webContents = {
      id: 1,
      isDevToolsOpened: vi.fn(() => false),
      isLoading: vi.fn(() => true),
      on: vi.fn(),
      setWindowOpenHandler: vi.fn()
    }
    constructor() {
      electronMock.browserWindowCreated()
    }
    loadFile = vi.fn()
    on = electronMock.windowOn
    once = electronMock.windowOn
  },
  Tray: class {
    constructor(image: unknown) {
      electronMock.trayCreated(image)
    }
    setToolTip = electronMock.setToolTip
    popUpContextMenu = electronMock.popUpContextMenu
    on = electronMock.trayOn
    destroy = vi.fn()
  }
}))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))
vi.mock('../storage', () => ({
  StorageService: class {
    getAccounts = serviceMock.getAccounts
    getCustomization = serviceMock.getCustomization
    getSettings = serviceMock.getSettings
    isUnlocked = serviceMock.isUnlocked
  }
}))
vi.mock('../usage-data', () => ({
  UsageDataService: {
    getInstance: () => ({ getCachedUsage: serviceMock.getCachedUsage })
  }
}))

import { TrayService } from '../tray'

describe('TrayService', () => {
  beforeEach(() => {
    Reflect.set(TrayService, 'instance', undefined)
    vi.clearAllMocks()
    serviceMock.isUnlocked.mockReturnValue(true)
    serviceMock.getSettings.mockReturnValue({ language: 'en' })
    serviceMock.getCustomization.mockResolvedValue(null)
    serviceMock.getAccounts.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    electronMock.templateMissing = false
  })

  const originalPlatform = process.platform
  function stubPlatform(platform: NodeJS.Platform): void {
    Object.defineProperty(process, 'platform', { value: platform })
  }

  function getTrayImage(): { path: string; setTemplateImage: ReturnType<typeof vi.fn>; size?: unknown } {
    return electronMock.trayCreated.mock.calls[0][0]
  }

  it('uses the full app icon on Windows', () => {
    stubPlatform('win32')
    TrayService.getInstance().createTray()

    expect(getTrayImage().path).toMatch(/icon.png$/)
  })

  it('uses a template image on macOS so the menu bar can show it', () => {
    stubPlatform('darwin')
    TrayService.getInstance().createTray()

    const image = getTrayImage()
    expect(image.path).toMatch(/trayTemplate.png$/)
    expect(image.setTemplateImage).toHaveBeenCalledWith(true)
  })

  it('falls back to a resized app icon on macOS when the template is missing', () => {
    stubPlatform('darwin')
    electronMock.templateMissing = true
    TrayService.getInstance().createTray()

    expect(getTrayImage().size).toEqual({ width: 18, height: 18 })
  })

  it('keeps the tooltip fixed to the app name', () => {
    const tray = TrayService.getInstance()
    tray.createTray()

    tray.triggerUpdate({ antigravity: [{ name: 'Anti', percent: 70 }] })

    expect(electronMock.setToolTip).toHaveBeenLastCalledWith('AI Code Quota Dashboard')
  })

  it('creates the popover lazily and refreshes through the main-process action', () => {
    vi.useFakeTimers()
    const refreshUsage = vi.fn().mockResolvedValue(undefined)
    const tray = TrayService.getInstance()
    tray.configure({
      openMainWindow: vi.fn(),
      refreshUsage
    })
    tray.createTray()

    expect(electronMock.browserWindowCreated).not.toHaveBeenCalled()

    const clickHandler = electronMock.trayOn.mock.calls
      .find(([event]) => event === 'click')?.[1]
    clickHandler?.({}, { x: 0, y: 0, width: 24, height: 24 })
    vi.runAllTimers()
    expect(electronMock.browserWindowCreated).toHaveBeenCalledTimes(1)

    const template = electronMock.buildMenu.mock.calls[0][0] as Array<{
      label?: string
      click?: () => void
    }>
    template.find(item => item.label === 'Refresh')?.click?.()
    expect(refreshUsage).toHaveBeenCalledTimes(1)
  })

  it('opens the full window on double-click without opening the popover', () => {
    vi.useFakeTimers()
    const openMainWindow = vi.fn(() => null as never)
    const tray = TrayService.getInstance()
    tray.configure({
      openMainWindow,
      refreshUsage: vi.fn().mockResolvedValue(undefined)
    })
    tray.createTray()

    const clickHandler = electronMock.trayOn.mock.calls
      .find(([event]) => event === 'click')?.[1]
    const doubleClickHandler = electronMock.trayOn.mock.calls
      .find(([event]) => event === 'double-click')?.[1]
    clickHandler?.({}, { x: 0, y: 0, width: 24, height: 24 })
    doubleClickHandler?.()
    vi.runAllTimers()

    expect(openMainWindow).toHaveBeenCalledTimes(1)
    expect(electronMock.browserWindowCreated).not.toHaveBeenCalled()
  })

  it('localizes the right-click menu using the configured language', () => {
    serviceMock.getSettings.mockReturnValue({ language: 'zh-TW' })
    const tray = TrayService.getInstance()
    tray.createTray()

    const rightClickHandler = electronMock.trayOn.mock.calls
      .find(([event]) => event === 'right-click')?.[1]
    rightClickHandler?.()
    const template = electronMock.buildMenu.mock.calls.at(-1)?.[0] as Array<{
      label?: string
    }>

    expect(template.flatMap(item => item.label ?? [])).toEqual([
      '開啟',
      '重新整理',
      '顯示總覽',
      '結束'
    ])
    expect(electronMock.popUpContextMenu).toHaveBeenCalledTimes(1)
  })

  it('includes only accounts configured to appear in the overview', async () => {
    vi.useFakeTimers()
    serviceMock.getCachedUsage.mockReturnValue({
      updatedAt: 1,
      providers: {
        antigravity: [
          { accountId: 'hidden', name: 'Hidden', usage: null },
          { accountId: 'shown-by-override', name: 'Shown', usage: null },
          { accountId: 'shown-by-fallback', name: 'Fallback', usage: null }
        ],
        githubCopilot: [],
        zaiCoding: [],
        codex: [{ accountId: 'hidden-codex', name: 'Codex', usage: null }],
        opencodeGo: [],
        commandCode: [],
        ollamaCloud: [],
        aiStudio: [],
        claude: []
      }
    })
    serviceMock.getCustomization.mockResolvedValue({
      global: { theme: 'system', accentColor: 'blue' },
      providers: {
        antigravity: {
          accountCardVisibility: {
            hidden: false,
            'shown-by-override': true
          }
        }
      }
    })
    serviceMock.getAccounts.mockImplementation(async provider => {
      if (provider === 'antigravity') {
        return [
          { id: 'hidden', showInOverview: true },
          { id: 'shown-by-override', showInOverview: false },
          { id: 'shown-by-fallback', showInOverview: true }
        ]
      }
      return provider === 'codex'
        ? [{ id: 'hidden-codex', showInOverview: false }]
        : []
    })

    const tray = TrayService.getInstance()
    tray.createTray()
    const clickHandler = electronMock.trayOn.mock.calls
      .find(([event]) => event === 'click')?.[1]
    clickHandler?.({}, { x: 0, y: 0, width: 24, height: 24 })
    vi.runAllTimers()
    const viewModelHandler = electronMock.ipcHandle.mock.calls
      .find(([channel]) => channel === 'tray:get-view-model')?.[1]

    const viewModel = await viewModelHandler?.({ sender: { id: 1 } })

    expect(viewModel.cache.providers.antigravity).toEqual([
      { accountId: 'shown-by-override', name: 'Shown', usage: null },
      { accountId: 'shown-by-fallback', name: 'Fallback', usage: null }
    ])
    expect(viewModel.cache.providers.codex).toEqual([])
  })
})
