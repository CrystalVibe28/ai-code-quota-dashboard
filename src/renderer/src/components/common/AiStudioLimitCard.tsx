import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OverflowTooltip } from '@/components/common/OverflowTooltip'
import { cn } from '@/lib/utils'
import type { AiStudioModelLimit } from '@shared/types'
import type { CardRadius, CardSize, OverviewLayout } from '@/types/customization'

interface Props extends AiStudioModelLimit {
  subtitle?: string
  className?: string
  cardSize?: CardSize
  cardRadius?: CardRadius
  overviewLayout?: OverviewLayout
  showVisibilityToggle?: boolean
  isVisibleInOverview?: boolean
  onVisibilityToggle?: (visible: boolean) => void
}

const sizeClasses: Record<CardSize, string> = {
  compact: 'p-4',
  default: 'p-5',
  large: 'p-6'
}

const radiusClasses: Record<CardRadius, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg'
}

export const AiStudioLimitCard = memo(function AiStudioLimitCard({
  model,
  displayName,
  rpm,
  tpm,
  rpd,
  rpmUsed,
  tpmUsed,
  rpdUsed,
  subtitle,
  className,
  cardSize = 'default',
  cardRadius = 'md',
  overviewLayout = 'cards',
  showVisibilityToggle = false,
  isVisibleInOverview = true,
  onVisibilityToggle
}: Props) {
  const { t, i18n } = useTranslation()
  const formatter = new Intl.NumberFormat(i18n.language)
  const metrics = [
    { label: t('aiStudio.rpm'), used: rpmUsed, limit: rpm },
    { label: t('aiStudio.tpm'), used: tpmUsed, limit: tpm },
    { label: t('aiStudio.rpd'), used: rpdUsed, limit: rpd }
  ]
  const formatMetric = (used: number, limit: number | null) => `${formatter.format(used)} / ${
    limit === null ? '—' : limit === -1 ? t('aiStudio.unlimited', { defaultValue: 'Unlimited' }) : formatter.format(limit)
  }`
  const title = displayName || model

  if (overviewLayout === 'compact') {
    return (
      <div className={cn('grid grid-cols-[minmax(10rem,1.35fr)_repeat(3,minmax(7rem,1fr))] items-center gap-x-3 px-4 py-2.5', className)}>
        <div className="min-w-0">
          <OverflowTooltip className="block truncate text-sm font-semibold leading-5">{title}</OverflowTooltip>
          {subtitle && (
            <p className="truncate text-xs leading-4 text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {metrics.map(({ label, used, limit }) => (
          <span key={label} className="font-data text-right text-sm font-semibold" aria-label={`${label}: ${t('aiStudio.usageHint')}`}>
            {formatMetric(used, limit)}
          </span>
        ))}
      </div>
    )
  }

  return (
    <Card className={cn(radiusClasses[cardRadius], 'min-w-0 overflow-hidden', className)}>
      <CardContent className={cn('min-w-0', sizeClasses[cardSize])}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <OverflowTooltip className="block truncate text-base font-semibold leading-6">
              {title}
            </OverflowTooltip>
            {subtitle && (
              <OverflowTooltip className="mt-1 block truncate text-xs leading-4 text-muted-foreground">
                {subtitle}
              </OverflowTooltip>
            )}
          </div>
          {showVisibilityToggle && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={isVisibleInOverview ? 'text-primary' : 'text-muted-foreground'}
              onClick={() => onVisibilityToggle?.(!isVisibleInOverview)}
              aria-label={isVisibleInOverview ? t('provider.hideFromOverview') : t('provider.showInOverview')}
            >
              {isVisibleInOverview ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            </Button>
          )}
        </div>

        <p className="mb-2 text-xs leading-4 text-muted-foreground">{t('aiStudio.usageHint')}</p>
        <dl className="space-y-2">
          {metrics.map(({ label, used, limit }) => (
            <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-md bg-surface-sunken px-3 py-2.5">
              <dt className="min-w-0 text-sm leading-5 text-muted-foreground">{label}</dt>
              <dd className="font-data whitespace-nowrap text-sm font-semibold leading-5">
                {formatMetric(used, limit)}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
})
