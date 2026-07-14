import { BrowserWindow, Notification } from 'electron'
import type { NotificationThreshold } from '../../shared/types/settings'
import { getAntigravityQuotaType } from '@shared/antigravityQuota'
import { formatCodexQuotaLabel } from '../../shared/codexQuota'

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

interface CodexRateWindow {
  used_percent: number
  limit_window_seconds: number
  reset_after_seconds: number
  reset_at: number
}

interface CodexRateLimit {
  allowed: boolean
  limit_reached: boolean
  primary_window: CodexRateWindow | null
  secondary_window: CodexRateWindow | null
}

interface CodexUsageData {
  plan_type: string
  rate_limit: CodexRateLimit | null
  code_review_rate_limit: CodexRateLimit | null
}

interface CodexUsageResult {
  accountId: string
  name: string
  email: string
  usage: CodexUsageData | null
  error?: string
}

interface OpencodeGoLimit {
  type: string
  remaining: number
  percentage: number
  resetTime?: string | number
}

interface OpencodeGoUsage {
  workspaceId: string
  workspaceName?: string
  limits: OpencodeGoLimit[]
}

interface OpencodeGoUsageResult {
  accountId: string
  name: string
  workspaceId: string
  usage: OpencodeGoUsage | null
  error?: string
}

// i18n translations for notifications
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    'notification.warning.title': '⚠️ Low Quota Warning',
    'notification.urgent.title': '🔴 Quota Running Low',
    'notification.critical.title': '🚨 Quota Critical',
    'notification.itemsBelow': '{{count}} item(s) below {{threshold}}%',
    'notification.andMore': '...and {{count}} more',
    'notification.antigravityQuotaTypes.geminiFiveHour': 'Gemini 5-hour quota',
    'notification.antigravityQuotaTypes.geminiWeekly': 'Gemini weekly quota',
    'notification.antigravityQuotaTypes.claudeGptFiveHour': 'Claude/GPT 5-hour quota',
    'notification.antigravityQuotaTypes.claudeGptWeekly': 'Claude/GPT weekly quota'
  },
  'zh-TW': {
    'notification.warning.title': '⚠️ 配額偏低警告',
    'notification.urgent.title': '🔴 配額即將耗盡',
    'notification.critical.title': '🚨 配額嚴重不足',
    'notification.itemsBelow': '{{count}} 個項目低於 {{threshold}}%',
    'notification.andMore': '...還有 {{count}} 個項目',
    'notification.antigravityQuotaTypes.geminiFiveHour': 'Gemini 5 小時配額',
    'notification.antigravityQuotaTypes.geminiWeekly': 'Gemini 每週配額',
    'notification.antigravityQuotaTypes.claudeGptFiveHour': 'Claude/GPT 5 小時配額',
    'notification.antigravityQuotaTypes.claudeGptWeekly': 'Claude/GPT 每週配額'
  },
  'zh-CN': {
    'notification.warning.title': '⚠️ 配额偏低警告',
    'notification.urgent.title': '🔴 配额即将耗尽',
    'notification.critical.title': '🚨 配额严重不足',
    'notification.itemsBelow': '{{count}} 个项目低于 {{threshold}}%',
    'notification.andMore': '...还有 {{count}} 个项目',
    'notification.antigravityQuotaTypes.geminiFiveHour': 'Gemini 5 小时配额',
    'notification.antigravityQuotaTypes.geminiWeekly': 'Gemini 每周配额',
    'notification.antigravityQuotaTypes.claudeGptFiveHour': 'Claude/GPT 5 小时配额',
    'notification.antigravityQuotaTypes.claudeGptWeekly': 'Claude/GPT 每周配额'
  }
}

export class NotificationService {
  private static instance: NotificationService
  private state: NotificationState
  private mainWindow: BrowserWindow | null = null
  /** Keep references to active notifications to prevent GC from collecting them */
  private activeNotifications: Set<Notification> = new Set()

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
    codexData: CodexUsageResult[],
    opencodeGoData: OpencodeGoUsageResult[],
    settings: AppSettings,
    filters: DisplayFilters
  ): void {
    if (!settings.notifications) {
      this.state.items.clear()
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
      this.state.items.clear()
      return
    }

    const itemsToNotify: LowQuotaItem[] = []
    const activeCardIds = new Set<string>()

    this.processAntigravityData(antigravityData, thresholds, itemsToNotify, filters, activeCardIds)
    this.processCopilotData(copilotData, thresholds, itemsToNotify, filters, activeCardIds)
    this.processZaiData(zaiData, thresholds, itemsToNotify, filters, activeCardIds)
    this.processCodexData(codexData, thresholds, itemsToNotify, filters, activeCardIds)
    this.processOpencodeGoData(opencodeGoData, thresholds, itemsToNotify, filters, activeCardIds)
    this.state.items.forEach((_, cardId) => {
      if (!activeCardIds.has(cardId)) this.state.items.delete(cardId)
    })

    if (itemsToNotify.length > 0) {
      this.sendNotifications(itemsToNotify, settings.language)
    }
  }

  private processAntigravityData(
    data: AntigravityUsageResult[],
    thresholds: number[],
    itemsToNotify: LowQuotaItem[],
    filters: DisplayFilters,
    activeCardIds: Set<string>
  ): void {
    for (const account of data) {
      if (!account.usage) continue

      for (const model of account.usage) {
        const percentage = Math.round(model.remainingFraction * 100)
        const cardId = `antigravity-${account.accountId}-${model.modelName}`
        activeCardIds.add(cardId)

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
    filters: DisplayFilters,
    activeCardIds: Set<string>
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
        activeCardIds.add(cardId)

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
    filters: DisplayFilters,
    activeCardIds: Set<string>
  ): void {
    for (const account of data) {
      if (!account.usage) continue

      for (const limit of account.usage.limits) {
        const percentage = 100 - limit.percentage
        const cardId = `zaiCoding-${account.accountId}-${limit.type}`
        activeCardIds.add(cardId)

        // Check if card is hidden
        if (filters.hiddenCardIds.has(cardId)) continue

        const crossedThreshold = this.checkThresholdCrossing(cardId, percentage, thresholds)
        if (crossedThreshold) {
          const displayType = limit.type
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
          itemsToNotify.push({
            provider: 'Zai Coding Plan',
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

  private processCodexData(
    data: CodexUsageResult[],
    thresholds: number[],
    itemsToNotify: LowQuotaItem[],
    filters: DisplayFilters,
    activeCardIds: Set<string>
  ): void {
    for (const account of data) {
      if (!account.usage) continue

      const windowEntries: { kind: 'rateLimit' | 'codeReview'; cardIdSuffix: string; window: CodexRateWindow | null }[] = [
        {
          kind: 'rateLimit',
          cardIdSuffix: 'rateLimit_primary',
          window: account.usage.rate_limit?.primary_window ?? null
        },
        {
          kind: 'rateLimit',
          cardIdSuffix: 'rateLimit_secondary',
          window: account.usage.rate_limit?.secondary_window ?? null
        },
        {
          kind: 'codeReview',
          cardIdSuffix: 'codeReview_primary',
          window: account.usage.code_review_rate_limit?.primary_window ?? null
        },
        {
          kind: 'codeReview',
          cardIdSuffix: 'codeReview_secondary',
          window: account.usage.code_review_rate_limit?.secondary_window ?? null
        }
      ]

      for (const entry of windowEntries) {
        if (!entry.window) continue

        const percentage = 100 - Math.min(entry.window.used_percent, 100)
        const cardId = `codex-${account.accountId}-${entry.cardIdSuffix}`
        activeCardIds.add(cardId)

        // Check if card is hidden
        if (filters.hiddenCardIds.has(cardId)) continue

        const crossedThreshold = this.checkThresholdCrossing(cardId, percentage, thresholds)
        if (crossedThreshold) {
          itemsToNotify.push({
            provider: 'Codex',
            accountName: account.email,
            itemName: formatCodexQuotaLabel(entry.window.limit_window_seconds, entry.kind),
            percentage,
            severity: this.getSeverity(crossedThreshold, thresholds),
            cardId
          })
        }
      }
    }
  }

  private processOpencodeGoData(
    data: OpencodeGoUsageResult[],
    thresholds: number[],
    itemsToNotify: LowQuotaItem[],
    filters: DisplayFilters,
    activeCardIds: Set<string>
  ): void {
    for (const account of data) {
      if (!account.usage) continue

      for (const limit of account.usage.limits) {
        const percentage = Math.round(limit.remaining)
        const cardId = `opencodeGo-${account.accountId}-${limit.type}`
        activeCardIds.add(cardId)

        if (filters.hiddenCardIds.has(cardId)) continue

        const crossedThreshold = this.checkThresholdCrossing(cardId, percentage, thresholds)
        if (crossedThreshold) {
          const displayType = limit.type
            .replace(/Usage$/, '')
            .replace(/([A-Z])/g, ' $1')
            .trim()
          itemsToNotify.push({
            provider: 'Opencode Go',
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
    const isFirstCheck = state === undefined // First time seeing this item (e.g., app startup)
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

    // On first check (app startup), just record state without notifying
    // This prevents notifications when the app is first launched
    if (isFirstCheck) {
      return null
    }

    if (previousThreshold === null) {
      // Quota dropped below a threshold (was above all thresholds before)
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
      .map(item => {
        const quotaType = item.provider === 'Antigravity'
          ? getAntigravityQuotaType(item.itemName)
          : null
        const itemName = quotaType
          ? t(`notification.antigravityQuotaTypes.${quotaType}`)
          : item.itemName
        return `• ${itemName} (${item.accountName}): ${item.percentage}%`
      })
      .join('\n')

    let body = itemLines
    if (remainingCount > 0) {
      body += '\n' + t('notification.andMore', { count: remainingCount })
    }

    const notification = new Notification({
      title,
      body
    })

    this.activeNotifications.add(notification)

    notification.on('click', () => {
      this.showWindowAndNavigate()
    })

    notification.on('close', () => {
      this.activeNotifications.delete(notification)
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
