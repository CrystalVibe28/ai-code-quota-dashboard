import { useTranslation } from 'react-i18next'
import type { AiStudioTier, AiStudioTierSource } from '@shared/types'
import { cn } from '@/lib/utils'

interface Props {
  tier: AiStudioTier
  source?: AiStudioTierSource
  className?: string
}

const sourceClasses: Record<AiStudioTierSource, string> = {
  system: 'text-muted-foreground',
  manual: 'text-warning',
  default: 'text-warning'
}

export function AiStudioTierBadge({ tier, source, className }: Props) {
  const { t } = useTranslation()

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        {t(`aiStudio.tiers.${tier}`)}
      </span>
      {tier !== 'free' && source && (
        <span className={cn('whitespace-nowrap text-xs', sourceClasses[source])}>
          {t(`aiStudio.tierSettings.sources.${source}`)}
        </span>
      )}
    </span>
  )
}
