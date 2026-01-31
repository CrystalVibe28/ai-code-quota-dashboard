import type { GlobalConfig, ProviderId } from '@/types/customization'

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  showOnlyLowQuota: false,
  hideUnlimitedQuota: true,
  
  gridColumns: 'auto',
  cardSize: 'default',
  providerOrder: ['antigravity', 'githubCopilot', 'zaiCoding'],
  
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
  githubCopilot: 'nav.githubCopilot',
  zaiCoding: 'nav.zaiCoding'
}

export const ACCENT_COLORS = [
  { id: 'blue', label: 'customization.visual.colors.blue', value: '221.2 83.2% 53.3%' },
  { id: 'green', label: 'customization.visual.colors.green', value: '142.1 76.2% 36.3%' },
  { id: 'purple', label: 'customization.visual.colors.purple', value: '262.1 83.3% 57.8%' },
  { id: 'orange', label: 'customization.visual.colors.orange', value: '24.6 95% 53.1%' },
  { id: 'pink', label: 'customization.visual.colors.pink', value: '346.8 77.2% 49.8%' },
  { id: 'cyan', label: 'customization.visual.colors.cyan', value: '189.5 94.5% 42.7%' }
] as const

export const GRID_COLUMN_OPTIONS = [
  { value: 1, label: 'customization.layout.gridOptions.1' },
  { value: 2, label: 'customization.layout.gridOptions.2' },
  { value: 3, label: 'customization.layout.gridOptions.3' },
  { value: 4, label: 'customization.layout.gridOptions.4' },
  { value: 'auto', label: 'customization.layout.gridOptions.auto' }
] as const

export const CARD_SIZE_OPTIONS = [
  { value: 'compact', label: 'customization.layout.sizeOptions.compact' },
  { value: 'default', label: 'customization.layout.sizeOptions.default' },
  { value: 'large', label: 'customization.layout.sizeOptions.large' }
] as const

export const AUTO_REFRESH_OPTIONS = [
  { value: 0, label: 'customization.interaction.refreshOptions.off' },
  { value: 30, label: 'customization.interaction.refreshOptions.30s' },
  { value: 60, label: 'customization.interaction.refreshOptions.1m' },
  { value: 120, label: 'customization.interaction.refreshOptions.2m' },
  { value: 300, label: 'customization.interaction.refreshOptions.5m' }
] as const
