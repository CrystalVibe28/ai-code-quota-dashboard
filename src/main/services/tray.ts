import { Tray, nativeImage, Menu, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export interface TrayTooltipData {
  antigravity?: Array<{ name: string; percent: number }>
  githubCopilot?: Array<{ name: string; percent: number }>
  zaiCoding?: Array<{ name: string; percent: number }>
}

export class TrayService {
  private static instance: TrayService
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null

  private constructor() {
  }

  static getInstance(): TrayService {
    if (!TrayService.instance) {
      TrayService.instance = new TrayService()
    }
    return TrayService.instance
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  private createTrayIcon(): Electron.NativeImage {
    const iconPath = is.dev
      ? join(__dirname, '../../resources/icon.png')
      : join(process.resourcesPath, 'icon.png')
    return nativeImage.createFromPath(iconPath)
  }

  createTray(): void {
    if (this.tray) {
      return
    }

    const icon = this.createTrayIcon()
    this.tray = new Tray(icon)

    this.tray.setToolTip('AI Code Quota Dashboard')

    this.tray.on('click', () => {
      this.showWindow()
    })

    this.updateMenu()
  }

  destroyTray(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }

  private showWindow(): void {
    if (!this.mainWindow) {
      return
    }

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }

    this.mainWindow.show()
    this.mainWindow.focus()
  }

  updateMenu(): void {
    if (!this.tray) {
      return
    }

    const menu = Menu.buildFromTemplate([
      {
        label: 'Open',
        click: () => {
          this.showWindow()
        }
      },
      { type: 'separator' },
      {
        label: 'Refresh',
        click: async () => {
          if (this.mainWindow) {
            this.mainWindow.webContents.send('app:refresh-all')
          }
        }
      },
      {
        label: 'Show Overview',
        click: () => {
          this.showWindow()
          if (this.mainWindow) {
            this.mainWindow.webContents.send('app:navigate-to-overview')
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(menu)
  }

  updateTooltip(data: TrayTooltipData): void {
    if (!this.tray) {
      return
    }

    const lines = ['AI Code Quota Dashboard', '']

    if (data.antigravity?.length) {
      lines.push('Antigravity:')
      data.antigravity.forEach(acc => {
        lines.push(`  ${acc.name}: ${acc.percent}%`)
      })
      lines.push('')
    }

    if (data.githubCopilot?.length) {
      lines.push('GitHub Copilot:')
      data.githubCopilot.forEach(acc => {
        lines.push(`  ${acc.name}: ${acc.percent}%`)
      })
      lines.push('')
    }

    if (data.zaiCoding?.length) {
      lines.push('Zai Coding Plan:')
      data.zaiCoding.forEach(acc => {
        lines.push(`  ${acc.name}: ${acc.percent}%`)
      })
    }

    this.tray.setToolTip(lines.join('\n'))
  }

  triggerUpdate(data: TrayTooltipData): void {
    this.updateTooltip(data)
  }
}
