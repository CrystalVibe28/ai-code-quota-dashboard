import type { CardSize, GlobalConfig, GridColumns, ProviderId } from '@/types/customization'

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  hideUnlimitedQuota: true,
  
  overviewLayout: 'compact',
  gridColumns: 'auto',
  cardSize: 'default',
  providerOrder: ['antigravity', 'githubCopilot', 'zaiCoding', 'codex', 'opencodeGo', 'aiStudio'],
  
  theme: 'system',
  accentColor: 'blue',
  progressStyle: 'solid',
  cardRadius: 'md',
  
  valueFormat: 'percent',
  decimalPlaces: 0,
  timeFormat: 'relative',
  showResetTime: true,
  
  autoRefresh: 60,
  cardClickAction: 'none',
  lowQuotaThreshold: 20,
  lowQuotaNotification: true,
  keyboardShortcuts: true
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  antigravity: 'nav.antigravity',
  aiStudio: 'nav.aiStudio',
  githubCopilot: 'nav.githubCopilot',
  zaiCoding: 'nav.zaiCoding',
  codex: 'nav.codex',
  opencodeGo: 'nav.opencodeGo'
}

export const ACCENT_COLORS = [
  { id: 'blue', label: 'customization.visual.colors.blue', value: '207.9 85.3% 40%', darkValue: '210 89.7% 62%' },
  { id: 'green', label: 'customization.visual.colors.green', value: '120 77.1% 27.5%', darkValue: '120 36.8% 51%' },
  { id: 'purple', label: 'customization.visual.colors.purple', value: '237.8 49.1% 56.9%', darkValue: '236.9 85.5% 72.9%' },
  { id: 'orange', label: 'customization.visual.colors.orange', value: '20.6 85.3% 42.7%', darkValue: '22.3 93.7% 62.4%' },
  { id: 'pink', label: 'customization.visual.colors.pink', value: '306.6 54.6% 49.2%', darkValue: '322 75.8% 56.3%' },
  { id: 'cyan', label: 'customization.visual.colors.cyan', value: '181.8 95.7% 27.1%', darkValue: '187.3 73% 46.5%' }
] as const

export const GRID_COLUMN_OPTIONS = [
  { value: 1, label: 'customization.layout.gridOptions.1' },
  { value: 2, label: 'customization.layout.gridOptions.2' },
  { value: 3, label: 'customization.layout.gridOptions.3' },
  { value: 4, label: 'customization.layout.gridOptions.4' },
  { value: 'auto', label: 'customization.layout.gridOptions.auto' }
] as const

export const OVERVIEW_LAYOUT_OPTIONS = [
  { value: 'compact', label: 'customization.layout.overviewLayoutOptions.compact' },
  { value: 'cards', label: 'customization.layout.overviewLayoutOptions.cards' }
] as const

export const CARD_SIZE_OPTIONS = [
  { value: 'compact', label: 'customization.layout.sizeOptions.compact' },
  { value: 'default', label: 'customization.layout.sizeOptions.default' },
  { value: 'large', label: 'customization.layout.sizeOptions.large' }
] as const

const GRID_CLASS_NAMES: Record<Exclude<GridColumns, 'auto'>, string> = {
  1: 'grid grid-cols-1 gap-4',
  2: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  3: 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'
}

const AUTO_GRID_CLASS_NAMES: Record<CardSize, string> = {
  compact: 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4',
  default: 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3',
  large: 'grid grid-cols-1 gap-4 lg:grid-cols-2'
}

export function getQuotaGridClassName(columns: GridColumns, cardSize: CardSize): string {
  return columns === 'auto' ? AUTO_GRID_CLASS_NAMES[cardSize] : GRID_CLASS_NAMES[columns]
}

export const AUTO_REFRESH_OPTIONS = [
  { value: 0, label: 'customization.interaction.refreshOptions.off' },
  { value: 30, label: 'customization.interaction.refreshOptions.30s' },
  { value: 60, label: 'customization.interaction.refreshOptions.1m' },
  { value: 120, label: 'customization.interaction.refreshOptions.2m' },
  { value: 300, label: 'customization.interaction.refreshOptions.5m' }
] as const
