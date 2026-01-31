import { BrowserWindow, Notification } from 'electron'

interface LowQuotaItem {
  provider: string
  accountName: string
  itemName: string
  percentage: number
}

interface NotificationState {
  lowQuotaItems: Map<string, { isLow: boolean; lastNotified: number }>
}

interface AppSettings {
  lowQuotaThreshold: number
  notifications: boolean
  notificationReminderInterval: number
}

interface AntigravityModelQuota {
  modelName: string
  remainingFraction: number
  resetTime?: string
}

interface AntigravityUsageResult {
  accountId: string
  email: string
  usage: AntigravityModelQuota[] | null
  error?: string
}

interface CopilotQuotaSnapshot {
  entitlement: number
  remaining: number
  percent_remaining: number
  unlimited: boolean
}

interface CopilotUsage {
  accessTypeSku: string
  copilotPlan: string
  quotaResetDate: string
  quotaSnapshots: Record<string, CopilotQuotaSnapshot>
}

interface CopilotUsageResult {
  accountId: string
  login: string
  usage: CopilotUsage | null
  error?: string
}

interface ZaiLimit {
  type: string
  usage: number
  currentValue: number
  remaining: number
  percentage: number
  nextResetTime?: number
}

interface ZaiUsage {
  limits: ZaiLimit[]
}

interface ZaiUsageResult {
  accountId: string
  name: string
  usage: ZaiUsage | null
  error?: string
}

export class NotificationService {
  private static instance: NotificationService
  private state: NotificationState
  private mainWindow: BrowserWindow | null = null

  private constructor() {
    this.state = {
      lowQuotaItems: new Map()
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  checkAndNotify(
    antigravityData: AntigravityUsageResult[],
    copilotData: CopilotUsageResult[],
    zaiData: ZaiUsageResult[],
    settings: AppSettings
  ): void {
    if (!settings.notifications) {
      return
    }

    const threshold = settings.lowQuotaThreshold
    const itemsToNotify: LowQuotaItem[] = []

    this.processAntigravityData(antigravityData, threshold, itemsToNotify, settings)
    this.processCopilotData(copilotData, threshold, itemsToNotify, settings)
    this.processZaiData(zaiData, threshold, itemsToNotify, settings)

    if (itemsToNotify.length > 0) {
      this.sendNotification(itemsToNotify, threshold)
    }
  }

  private processAntigravityData(
    data: AntigravityUsageResult[],
    threshold: number,
    itemsToNotify: LowQuotaItem[],
    settings: AppSettings
  ): void {
    for (const account of data) {
      if (!account.usage) continue

      for (const model of account.usage) {
        const percentage = Math.round(model.remainingFraction * 100)
        const key = `antigravity:${account.accountId}:${model.modelName}`

        if (percentage <= threshold) {
          const notifyType = this.shouldNotify(key, settings)
          if (notifyType !== 'none') {
            itemsToNotify.push({
              provider: 'Antigravity',
              accountName: account.email,
              itemName: model.modelName,
              percentage
            })
            this.state.lowQuotaItems.set(key, { isLow: true, lastNotified: Date.now() })
          }
        } else {
          this.state.lowQuotaItems.set(key, { isLow: false, lastNotified: 0 })
        }
      }
    }
  }

  private processCopilotData(
    data: CopilotUsageResult[],
    threshold: number,
    itemsToNotify: LowQuotaItem[],
    settings: AppSettings
  ): void {
    for (const account of data) {
      if (!account.usage) continue

      for (const [quotaType, snapshot] of Object.entries(account.usage.quotaSnapshots)) {
        if (snapshot.unlimited) continue

        const percentage = snapshot.percent_remaining
        const key = `copilot:${account.accountId}:${quotaType}`

        if (percentage <= threshold) {
          const notifyType = this.shouldNotify(key, settings)
          if (notifyType !== 'none') {
            const displayType = quotaType.charAt(0).toUpperCase() + quotaType.slice(1)
            itemsToNotify.push({
              provider: 'GitHub Copilot',
              accountName: account.login,
              itemName: displayType,
              percentage
            })
            this.state.lowQuotaItems.set(key, { isLow: true, lastNotified: Date.now() })
          }
        } else {
          this.state.lowQuotaItems.set(key, { isLow: false, lastNotified: 0 })
        }
      }
    }
  }

  private processZaiData(
    data: ZaiUsageResult[],
    threshold: number,
    itemsToNotify: LowQuotaItem[],
    settings: AppSettings
  ): void {
    for (const account of data) {
      if (!account.usage) continue

      for (const limit of account.usage.limits) {
        const percentage = 100 - limit.percentage
        const key = `zai:${account.accountId}:${limit.type}`

        if (percentage <= threshold) {
          const notifyType = this.shouldNotify(key, settings)
          if (notifyType !== 'none') {
            const displayType = limit.type
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ')
            itemsToNotify.push({
              provider: 'Z.ai',
              accountName: account.name,
              itemName: displayType,
              percentage
            })
            this.state.lowQuotaItems.set(key, { isLow: true, lastNotified: Date.now() })
          }
        } else {
          this.state.lowQuotaItems.set(key, { isLow: false, lastNotified: 0 })
        }
      }
    }
  }

  private shouldNotify(key: string, settings: AppSettings): 'first' | 'reminder' | 'none' {
    const entry = this.state.lowQuotaItems.get(key)

    if (!entry || !entry.isLow) {
      return 'first'
    }

    // 如果通知間隔為 0，表示不重複通知，只發送首次通知
    if (settings.notificationReminderInterval === 0) {
      return 'none'
    }

    const intervalMs = settings.notificationReminderInterval * 60 * 1000
    const elapsed = Date.now() - entry.lastNotified

    if (elapsed >= intervalMs) {
      return 'reminder'
    }

    return 'none'
  }

  private sendNotification(items: LowQuotaItem[], threshold: number): void {
    const count = items.length
    const itemLines = items
      .map(item => `• ${item.itemName} (${item.accountName}): ${item.percentage}%`)
      .join('\n')

    const notification = new Notification({
      title: '⚠️ Low Quota Alert',
      body: `${count} item${count > 1 ? 's' : ''} below ${threshold}%:\n${itemLines}`
    })

    notification.on('click', () => {
      this.showWindowAndNavigate()
    })

    notification.show()
  }

  private showWindowAndNavigate(): void {
    if (!this.mainWindow) {
      return
    }

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }

    this.mainWindow.show()
    this.mainWindow.focus()

    this.mainWindow.webContents.send('app:navigate-to-overview')
  }

  resetState(): void {
    this.state.lowQuotaItems.clear()
  }
}
