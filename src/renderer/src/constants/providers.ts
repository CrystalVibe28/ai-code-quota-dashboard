import type { JSXElementConstructor, SVGProps } from 'react'
import AiStudio from '@lobehub/icons/es/AiStudio/components/Mono'
import Antigravity from '@lobehub/icons/es/Antigravity/components/Mono'
import Codex from '@lobehub/icons/es/Codex/components/Mono'
import GithubCopilot from '@lobehub/icons/es/GithubCopilot/components/Mono'
import OpenCode from '@lobehub/icons/es/OpenCode/components/Mono'
import Ollama from '@lobehub/icons/es/Ollama/components/Mono'
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
    id: 'aiStudio' as const,
    name: 'Google AI Studio',
    labelKey: 'nav.aiStudio',
    icon: AiStudio,
    mode: 'oauth' as const,
    oauthProvider: 'Google'
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
  },
  {
    id: 'ollamaCloud' as const,
    name: 'Ollama Cloud',
    labelKey: 'nav.ollamaCloud',
    icon: Ollama,
    mode: 'oauth' as const,
    oauthProvider: 'Ollama'
  }
]

// Providers sorted alphabetically by name
export const PROVIDERS: ProviderDefinition[] = PROVIDERS_UNSORTED.sort((a, b) => 
  a.name.localeCompare(b.name)
)

export const getProviderById = (id: ProviderId): ProviderDefinition | undefined => {
  return PROVIDERS.find(p => p.id === id)
}
