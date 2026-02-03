// src/shared/types/customization.ts
// Shared customization type definitions

// Re-export ProviderId for convenience
export type { ProviderId } from './accounts'
import type { ProviderId } from './accounts'

export type CardId = string // format: `${providerId}-${accountId}-${modelName}`

export type GridColumns = 1 | 2 | 3 | 4 | 'auto'
export type CardSize = 'compact' | 'default' | 'large'
export type Theme = 'light' | 'dark' | 'system'
export type ProgressStyle = 'solid' | 'gradient' | 'striped'
export type CardRadius = 'none' | 'sm' | 'md' | 'lg'
export type ValueFormat = 'percent' | 'absolute' | 'both'
export type TimeFormat = 'relative' | 'absolute'
export type CardClickAction = 'none' | 'detail' | 'copy'
export type CardSortBy = 'manual' | 'name' | 'quota-asc' | 'quota-desc'
export type AutoRefresh = 0 | 30 | 60 | 120 | 300

/**
 * Global configuration - all fields required (with defaults)
 */
export interface GlobalConfig {
  // Display
  hideUnlimitedQuota: boolean
  
  // Layout
  gridColumns: GridColumns
  cardSize: CardSize
  providerOrder: ProviderId[]
  
  // Visual
  theme: Theme
  accentColor: string
  progressStyle: ProgressStyle
  cardRadius: CardRadius
  
  // Data
  valueFormat: ValueFormat
  decimalPlaces: 0 | 1 | 2
  timeFormat: TimeFormat
  showResetTime: boolean
  
  // Interaction
  autoRefresh: AutoRefresh
  cardClickAction: CardClickAction
  lowQuotaThreshold: number
  lowQuotaNotification: boolean
  keyboardShortcuts: boolean
}

/**
 * Provider-level configuration - all optional (overrides global)
 */
export interface ProviderConfig {
  collapsed?: boolean
  accountCollapsed?: Record<string, boolean>
  gridColumns?: GridColumns
  cardSize?: CardSize
  cardOrder?: CardId[]
  cardSortBy?: CardSortBy
  progressStyle?: ProgressStyle
  lowQuotaNotification?: boolean
}

/**
 * Card-level configuration - minimal overrides
 */
export interface CardConfig {
  visible?: boolean
  valueFormat?: ValueFormat
  showResetTime?: boolean
}

/**
 * Full customization state
 */
export interface CustomizationState {
  global: GlobalConfig
  providers: Record<ProviderId, ProviderConfig>
  cards: Record<CardId, CardConfig>
}

/**
 * Computed effective configuration for a specific card
 */
export interface EffectiveCardConfig {
  visible: boolean
  gridColumns: GridColumns
  cardSize: CardSize
  progressStyle: ProgressStyle
  valueFormat: ValueFormat
  showResetTime: boolean
  cardRadius: CardRadius
  lowQuotaThreshold: number
}

/**
 * Default global configuration
 */
export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  // Display
  hideUnlimitedQuota: false,
  
  // Layout
  gridColumns: 'auto',
  cardSize: 'default',
  providerOrder: ['antigravity', 'githubCopilot', 'zaiCoding'],
  
  // Visual
  theme: 'system',
  accentColor: '#3b82f6',
  progressStyle: 'solid',
  cardRadius: 'md',
  
  // Data
  valueFormat: 'percent',
  decimalPlaces: 0,
  timeFormat: 'relative',
  showResetTime: true,
  
  // Interaction
  autoRefresh: 60,
  cardClickAction: 'none',
  lowQuotaThreshold: 20,
  lowQuotaNotification: true,
  keyboardShortcuts: true
}
