import type {
  AntigravityUsage,
  ClaudeUsage,
  CodexAccount,
  CodexUsageData,
  CommandCodeUsage
} from '@shared/types'

// Pro price points are inferred from the plan names; OpenAI does not document the mapping.
const CODEX_PLANS: Record<string, string> = {
  free: 'Free',
  go: 'Go',
  plus: 'Plus',
  prolite: 'Pro 100',
  pro: 'Pro 200',
  promax: 'Pro 300',
  team: 'Business',
  business: 'Business',
  self_serve_business_prolite: 'Business',
  self_serve_business_usage_based: 'Business',
  enterprise: 'Enterprise',
  hc: 'Enterprise',
  ent26: 'Enterprise',
  enterprise_cbp_automation: 'Enterprise',
  enterprise_cbp_usage_based: 'Enterprise',
  edu: 'Edu',
  education: 'Edu',
  edu_plus: 'Edu Plus',
  edu_pro: 'Edu Pro'
}

const COMMAND_CODE_PLANS: Record<string, string> = {
  'individual-provider': 'Provider',
  'individual-go': 'Go',
  'individual-go-v1': 'Go',
  'individual-goat': 'GOAT',
  'individual-pro': 'Pro',
  'individual-pro-v1': 'Pro',
  'individual-max': 'Max 10x',
  'individual-ultra': 'Max 20x',
  'teams-pro': 'Teams'
}

// Unknown plan ids are shown as-is so new plans stay visible instead of looking like Free.
function label(plans: Record<string, string>, id: string | undefined): string | undefined {
  const value = id?.trim()
  if (!value || value === 'unknown') return undefined
  return plans[value.toLowerCase()] ?? value
}

export function getAccountPlan(
  providerId: string | undefined,
  account: unknown,
  usageItem: { usage?: unknown; plan?: AntigravityUsage['plan'] } | undefined
): string | undefined {
  const usage = usageItem?.usage
  switch (providerId) {
    case 'antigravity':
      return usageItem?.plan
    case 'codex':
      return label(
        CODEX_PLANS,
        (usage as CodexUsageData | null | undefined)?.plan_type
          || (account as CodexAccount | undefined)?.planType
      )
    case 'commandCode':
      return label(COMMAND_CODE_PLANS, (usage as CommandCodeUsage | null | undefined)?.credits?.planId)
    case 'claude':
      return (usage as ClaudeUsage | null | undefined)?.plan
    default:
      return undefined
  }
}
