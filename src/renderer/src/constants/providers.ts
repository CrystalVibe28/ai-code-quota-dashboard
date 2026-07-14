import type { JSXElementConstructor, SVGProps } from 'react'
import Antigravity from '@lobehub/icons/es/Antigravity/components/Mono'
import Codex from '@lobehub/icons/es/Codex/components/Mono'
import GithubCopilot from '@lobehub/icons/es/GithubCopilot/components/Mono'
import OpenCode from '@lobehub/icons/es/OpenCode/components/Mono'
import ZAI from '@lobehub/icons/es/ZAI/components/Mono'
import type { ProviderId } from '@/types/customization'

type ProviderIcon = JSXElementConstructor<SVGProps<SVGSVGElement>>

export interface ProviderDefinition {
  id: ProviderId
  name: string
  labelKey: string
  icon: ProviderIcon
  mode: 'oauth' | 'apiKey'
  oauthProvider?: string
}

const PROVIDERS_UNSORTED: ProviderDefinition[] = [
  {
    id: 'antigravity' as const,
    name: 'Antigravity',
    labelKey: 'nav.antigravity',
    icon: Antigravity,
    mode: 'oauth' as const,
    oauthProvider: 'Google'
  },
  {
    id: 'githubCopilot' as const,
    name: 'GitHub Copilot',
    labelKey: 'nav.githubCopilot',
    icon: GithubCopilot,
    mode: 'oauth' as const,
    oauthProvider: 'GitHub'
  },
  {
    id: 'zaiCoding' as const,
    name: 'Zai Coding Plan',
    labelKey: 'nav.zaiCoding',
    icon: ZAI,
    mode: 'apiKey' as const
  },
  {
    id: 'codex' as const,
    name: 'Codex',
    labelKey: 'nav.codex',
    icon: Codex,
    mode: 'oauth' as const,
    oauthProvider: 'OpenAI'
  },
  {
    id: 'opencodeGo' as const,
    name: 'Opencode Go',
    labelKey: 'nav.opencodeGo',
    icon: OpenCode,
    mode: 'oauth' as const,
    oauthProvider: 'Google / GitHub'
  }
]

// Providers sorted alphabetically by name
export const PROVIDERS: ProviderDefinition[] = PROVIDERS_UNSORTED.sort((a, b) => 
  a.name.localeCompare(b.name)
)

export const getProviderById = (id: ProviderId): ProviderDefinition | undefined => {
  return PROVIDERS.find(p => p.id === id)
}
