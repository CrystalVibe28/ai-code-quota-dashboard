import type { Theme } from './customization'
import type { LocalUsageCache } from './usage'

export interface TrayPopoverViewModel {
  locked: boolean
  language: string
  theme: Theme
  accentColor: string
  cache: LocalUsageCache
}
