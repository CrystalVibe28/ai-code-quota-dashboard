import { Sparkles, Github, Zap, type LucideIcon } from 'lucide-react'
import type { ProviderId } from '@/types/customization'

export interface ProviderDefinition {
  id: ProviderId
  name: string
  labelKey: string
  icon: LucideIcon
  mode: 'oauth' | 'apiKey'
  oauthProvider?: string
}

const PROVIDERS_UNSORTED: ProviderDefinition[] = [
  {
    id: 'antigravity' as const,
    name: 'Antigravity',
    labelKey: 'nav.antigravity',
    icon: Sparkles,
    mode: 'oauth' as const,
    oauthProvider: 'Google'
  },
  {
    id: 'githubCopilot' as const,
    name: 'GitHub Copilot',
    labelKey: 'nav.githubCopilot',
    icon: Github,
    mode: 'oauth' as const,
    oauthProvider: 'GitHub'
  },
  {
    id: 'zaiCoding' as const,
    name: 'Zai Coding',
    labelKey: 'nav.zaiCoding',
    icon: Zap,
    mode: 'apiKey' as const
  }
]

// Providers sorted alphabetically by name
export const PROVIDERS: ProviderDefinition[] = PROVIDERS_UNSORTED.sort((a, b) => 
  a.name.localeCompare(b.name)
)

export const getProviderById = (id: ProviderId): ProviderDefinition | undefined => {
  return PROVIDERS.find(p => p.id === id)
}

export const getProviderIcon = (id: ProviderId): LucideIcon => {
  return getProviderById(id)?.icon || Zap
}
