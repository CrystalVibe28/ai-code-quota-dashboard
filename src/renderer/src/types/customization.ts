// src/renderer/src/types/customization.ts

export type ProviderId = 'antigravity' | 'githubCopilot' | 'zaiCoding'
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

// Global config - all fields required (defaults)
export interface GlobalConfig {
  // Display
  showOnlyLowQuota: boolean
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

// Provider config - all optional (overrides)
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

// Card config - minimal overrides
export interface CardConfig {
  visible?: boolean
  valueFormat?: ValueFormat
  showResetTime?: boolean
}

// Full state
export interface CustomizationState {
  global: GlobalConfig
  providers: Record<ProviderId, ProviderConfig>
  cards: Record<CardId, CardConfig>
}

// Computed config for a specific card
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
