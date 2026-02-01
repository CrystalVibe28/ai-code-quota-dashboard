// src/shared/types/settings.ts
// Shared settings type definitions

/**
 * Notification threshold configuration
 * Each threshold triggers a notification when quota first drops to or below it
 */
export interface NotificationThreshold {
  /** Threshold percentage (0-100) */
  value: number
  /** Whether this threshold is enabled */
  enabled: boolean
  /** Custom name for the threshold (optional, for display purposes) */
  name?: string
}

/**
 * Application settings
 */
export interface Settings {
  refreshInterval: number
  /** @deprecated Use notificationThresholds instead */
  lowQuotaThreshold: number
  notifications: boolean
  language: string
  closeToTray: boolean
  /** @deprecated Replaced by tiered notification system */
  notificationReminderInterval: number
  /**
   * Tiered notification thresholds
   * Notifications are sent when quota first crosses each enabled threshold
   * Default: [25%, 10%, 5%] (warning, urgent, critical)
   */
  notificationThresholds: NotificationThreshold[]
}

/**
 * Default notification thresholds
 */
export const DEFAULT_NOTIFICATION_THRESHOLDS: NotificationThreshold[] = [
  { value: 25, enabled: true },
  { value: 10, enabled: true },
  { value: 5, enabled: true }
]

/**
 * Default application settings
 */
export const DEFAULT_SETTINGS: Settings = {
  refreshInterval: 60,
  lowQuotaThreshold: 10, // deprecated
  notifications: true,
  language: 'en',
  closeToTray: false,
  notificationReminderInterval: 0, // deprecated
  notificationThresholds: DEFAULT_NOTIFICATION_THRESHOLDS
}
