import { vi } from 'vitest'

// Mock Electron APIs for main process tests
export const mockElectron = {
  app: {
    getPath: vi.fn().mockReturnValue('/mock/user/data'),
    getName: vi.fn().mockReturnValue('ai-code-quota-dashboard'),
    getVersion: vi.fn().mockReturnValue('1.0.0'),
    quit: vi.fn(),
    on: vi.fn(),
    once: vi.fn()
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeHandler: vi.fn()
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn().mockReturnValue(false),
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    webContents: {
      send: vi.fn(),
      on: vi.fn()
    }
  })),
  Notification: vi.fn().mockImplementation(() => ({
    show: vi.fn(),
    on: vi.fn()
  })),
  Tray: vi.fn().mockImplementation(() => ({
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn()
  })),
  Menu: {
    buildFromTemplate: vi.fn().mockReturnValue({}),
    setApplicationMenu: vi.fn()
  },
  nativeImage: {
    createFromPath: vi.fn().mockReturnValue({})
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined)
  }
}

// Mock fs module
export const mockFs = {
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue('{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([])
}

// Helper to setup electron mock
export function setupElectronMock(): void {
  vi.mock('electron', () => mockElectron)
}

// Helper to setup fs mock
export function setupFsMock(): void {
  vi.mock('fs', () => mockFs)
}
