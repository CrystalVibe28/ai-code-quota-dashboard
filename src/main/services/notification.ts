import { BrowserWindow, Notification } from 'electron'
import type { NotificationThreshold } from '../../shared/types/settings'

/**
 * Severity levels for notifications
 * Higher index = more severe
 */
export type NotificationSeverity = 'warning' | 'urgent' | 'critical'

interface LowQuotaItem {
  provider: string
  accountName: string
  itemName: string
  percentage: number
  severity: NotificationSeverity
  cardId: string
}

interface ItemNotificationState {
  /** Last notified threshold value (e.g., 25, 10, 5) */
  lastNotifiedThreshold: number | null
  /** Current percentage when last checked */
  lastPercentage: number
}

interface NotificationState {
  items: Map<string, ItemNotificationState>
}

interface AppSettings {
  notifications: boolean
  notificationThresholds: NotificationThreshold[]
  language: string
}

interface DisplayFilters {
  hideUnlimitedQuota: boolean
  hiddenCardIds: Set<string>
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

// i18n translations for notifications
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    'notification.warning.title': '⚠️ Low Quota Warning',
    'notification.urgent.title': '🔴 Quota Running Low',
    'notification.critical.title': '🚨 Quota Critical',
    'notification.itemsBelow': '{{count}} item(s) below {{threshold}}%',
    'notification.andMore': '...and {{count}} more'
  },
  'zh-TW': {
    'notification.warning.title': '⚠️ 配額偏低警告',
    'notification.urgent.title': '🔴 配額即將耗盡',
    'notification.critical.title': '🚨 配額嚴重不足',
    'notification.itemsBelow': '{{count}} 個項目低於 {{threshold}}%',
    'notification.andMore': '...還有 {{count}} 個項目'
  },
  'zh-CN': {
    'notification.warning.title': '⚠️ 配额偏低警告',
    'notification.urgent.title': '🔴 配额即将耗尽',
    'notification.critical.title': '🚨 配额严重不足',
    'notification.itemsBelow': '{{count}} 个项目低于 {{threshold}}%',
    'notification.andMore': '...还有 {{count}} 个项目'
  }
}

export class NotificationService {
  private static instance: NotificationService
  private state: NotificationState
  private mainWindow: BrowserWindow | null = null

  private constructor() {
    this.state = {
      items: new Map()
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

  /**
   * Check all provider data and send notifications for items crossing thresholds
   */
  checkAndNotify(
    antigravityData: AntigravityUsageResult[],
    copilotData: CopilotUsageResult[],
    zaiData: ZaiUsageResult[],
    settings: AppSettings,
    filters: DisplayFilters
  ): void {
    if (!settings.notifications) {
      return
    }

    // Default thresholds if not set (for backwards compatibility)
    const defaultThresholds: NotificationThreshold[] = [
      { value: 25, enabled: true },
      { value: 10, enabled: true },
      { value: 5, enabled: true }
    ]

    const notificationThresholds = settings.notificationThresholds || defaultThresholds

    // Get enabled thresholds, sorted from highest to lowest
    const thresholds = notificationThresholds
      .filter(t => t.enabled)
      .map(t => t.value)
      .sort((a, b) => b - a)

    if (thresholds.length === 0) {
      return
    }

    const itemsToNotify: LowQuotaItem[] = []

    this.processAntigravityData(antigravityData, thresholds, itemsToNotify, filters)
    this.processCopilotData(copilotData, thresholds, itemsToNotify, filters)
    this.processZaiData(zaiData, thresholds, itemsToNotify, filters)

    if (itemsToNotify.length > 0) {
      this.sendNotifications(itemsToNotify, settings.language)
    }
  }

  private processAntigravityData(
    data: AntigravityUsageResult[],
    thresholds: number[],
    itemsToNotify: LowQuotaItem[],
    filters: DisplayFilters
  ): void {
    for (const account of data) {
      if (!account.usage) continue

      for (const model of account.usage) {
        const percentage = Math.round(model.remainingFraction * 100)
        const cardId = `antigravity-${account.accountId}-${model.modelName}`

        // Check if card is hidden
        if (filters.hiddenCardIds.has(cardId)) continue

        const crossedThreshold = this.checkThresholdCrossing(cardId, percentage, thresholds)
        if (crossedThreshold) {
          itemsToNotify.push({
            provider: 'Antigravity',
            accountName: account.email,
            itemName: model.modelName,
            percentage,
            severity: this.getSeverity(crossedThreshold, thresholds),
            cardId
          })
        }
      }
    }
  }

  private processCopilotData(
    data: CopilotUsageResult[],
    thresholds: number[],
    itemsToNotify: LowQuotaItem[],
    filters: DisplayFilters
  ): void {
    for (const account of data) {
      if (!account.usage) continue

      for (const [quotaType, snapshot] of Object.entries(account.usage.quotaSnapshots)) {
        // Skip unlimited quotas if filter is enabled
        if (snapshot.unlimited && filters.hideUnlimitedQuota) continue
        // Skip unlimited quotas for notifications (they don't need alerts)
        if (snapshot.unlimited) continue

        const percentage = snapshot.percent_remaining
        const cardId = `githubCopilot-${account.accountId}-${quotaType}`

        // Check if card is hidden
        if (filters.hiddenCardIds.has(cardId)) continue

        const crossedThreshold = this.checkThresholdCrossing(cardId, percentage, thresholds)
        if (crossedThreshold) {
          const displayType = quotaType.charAt(0).toUpperCase() + quotaType.slice(1)
          itemsToNotify.push({
            provider: 'GitHub Copilot',
            accountName: account.login,
            itemName: displayType,
            percentage,
            severity: this.getSeverity(crossedThreshold, thresholds),
            cardId
          })
        }
      }
    }
  }

  private processZaiData(
    data: ZaiUsageResult[],
    thresholds: number[],
    itemsToNotify: LowQuotaItem[],
    filters: DisplayFilters
  ): void {
    for (const account of data) {
      if (!account.usage) continue

      for (const limit of account.usage.limits) {
        const percentage = 100 - limit.percentage
        const cardId = `zaiCoding-${account.accountId}-${limit.type}`

        // Check if card is hidden
        if (filters.hiddenCardIds.has(cardId)) continue

        const crossedThreshold = this.checkThresholdCrossing(cardId, percentage, thresholds)
        if (crossedThreshold) {
          const displayType = limit.type
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
          itemsToNotify.push({
            provider: 'Z.ai',
            accountName: account.name,
            itemName: displayType,
            percentage,
            severity: this.getSeverity(crossedThreshold, thresholds),
            cardId
          })
        }
      }
    }
  }

  /**
   * Check if a threshold was crossed and should trigger a notification
   * Returns the crossed threshold value, or null if no notification needed
   */
  private checkThresholdCrossing(
    cardId: string,
    currentPercentage: number,
    thresholds: number[]
  ): number | null {
    const state = this.state.items.get(cardId)
    const previousThreshold = state?.lastNotifiedThreshold ?? null
    const previousPercentage = state?.lastPercentage ?? 100

    // Find the highest threshold that current percentage is at or below
    let currentThreshold: number | null = null
    for (const threshold of thresholds) {
      if (currentPercentage <= threshold) {
        currentThreshold = threshold
        break // thresholds are sorted highest to lowest
      }
    }

    // Update state
    this.state.items.set(cardId, {
      lastNotifiedThreshold: currentThreshold,
      lastPercentage: currentPercentage
    })

    // Determine if we should notify
    if (currentThreshold === null) {
      // Quota is above all thresholds, no notification needed
      // State is reset, so if it drops again we'll notify
      return null
    }

    if (previousThreshold === null) {
      // First time crossing any threshold
      return currentThreshold
    }

    if (currentThreshold < previousThreshold) {
      // Crossed to a more severe threshold
      return currentThreshold
    }

    // Check if quota recovered and then dropped again
    // This happens when previousPercentage was above the threshold but now it's at or below
    if (previousPercentage > currentThreshold && currentPercentage <= currentThreshold) {
      return currentThreshold
    }

    // Already notified for this threshold level
    return null
  }

  /**
   * Get severity level based on threshold position
   */
  private getSeverity(threshold: number, thresholds: number[]): NotificationSeverity {
    const sortedThresholds = [...thresholds].sort((a, b) => b - a)
    const index = sortedThresholds.indexOf(threshold)
    
    if (index === sortedThresholds.length - 1) {
      return 'critical'
    } else if (index === sortedThresholds.length - 2 && sortedThresholds.length >= 2) {
      return 'urgent'
    }
    return 'warning'
  }

  /**
   * Send notifications grouped by severity
   */
  private sendNotifications(items: LowQuotaItem[], language: string): void {
    // Group items by severity
    const bySeverity: Record<NotificationSeverity, LowQuotaItem[]> = {
      critical: [],
      urgent: [],
      warning: []
    }

    for (const item of items) {
      bySeverity[item.severity].push(item)
    }

    // Send separate notifications for each severity level (most severe first)
    const severityOrder: NotificationSeverity[] = ['critical', 'urgent', 'warning']
    
    for (const severity of severityOrder) {
      const severityItems = bySeverity[severity]
      if (severityItems.length > 0) {
        this.sendSingleNotification(severityItems, severity, language)
      }
    }
  }

  private sendSingleNotification(
    items: LowQuotaItem[],
    severity: NotificationSeverity,
    language: string
  ): void {
    const t = (key: string, params?: Record<string, string | number>): string => {
      const lang = TRANSLATIONS[language] || TRANSLATIONS['en']
      let text = lang[key] || TRANSLATIONS['en'][key] || key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{{${k}}}`, String(v))
        }
      }
      return text
    }

    const title = t(`notification.${severity}.title`)
    
    // Build body - show max 3 items, then "and X more"
    const maxItems = 3
    const displayItems = items.slice(0, maxItems)
    const remainingCount = items.length - maxItems

    const itemLines = displayItems
      .map(item => `• ${item.itemName} (${item.accountName}): ${item.percentage}%`)
      .join('\n')

    let body = itemLines
    if (remainingCount > 0) {
      body += '\n' + t('notification.andMore', { count: remainingCount })
    }

    const notification = new Notification({
      title,
      body
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

  /**
   * Reset all notification state
   * Call this when thresholds are changed
   */
  resetState(): void {
    this.state.items.clear()
  }

  /**
   * Reset state for a specific item
   */
  resetItemState(cardId: string): void {
    this.state.items.delete(cardId)
  }

  /**
   * Get current notification state (for debugging)
   */
  getState(): Map<string, ItemNotificationState> {
    return new Map(this.state.items)
  }
}
