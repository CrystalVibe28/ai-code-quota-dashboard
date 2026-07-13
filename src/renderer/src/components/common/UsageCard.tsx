import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn, getProgressColor, getQuotaColor, formatResetTime } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Eye, EyeOff } from 'lucide-react'
import type { CardSize, ProgressStyle, ValueFormat, TimeFormat, CardRadius } from '@/types/customization'

interface UsageCardProps {
  title: string
  subtitle?: string
  percentage: number
  remaining?: number
  total?: number
  resetTime?: string | number
  className?: string
  cardSize?: CardSize
  progressStyle?: ProgressStyle
  valueFormat?: ValueFormat
  decimalPlaces?: 0 | 1 | 2
  timeFormat?: TimeFormat
  showResetTime?: boolean
  cardRadius?: CardRadius
  onClick?: () => void
  showVisibilityToggle?: boolean
  isVisibleInOverview?: boolean
  onVisibilityToggle?: (visible: boolean) => void
  /** Used to force re-render when refreshing to update relative time display */
  refreshKey?: number
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

const progressStyleClasses: Record<ProgressStyle, string> = {
  solid: '',
  gradient: 'bg-gradient-to-r from-primary/80 to-primary',
  striped: 'bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)]'
}

export const UsageCard = memo(function UsageCard({
  title,
  subtitle,
  percentage,
  remaining,
  total,
  resetTime,
  className,
  cardSize = 'default',
  progressStyle = 'solid',
  valueFormat = 'percent',
  decimalPlaces = 0,
  timeFormat = 'relative',
  showResetTime = true,
  cardRadius = 'md',
  onClick,
  showVisibilityToggle = false,
  isVisibleInOverview = true,
  onVisibilityToggle,
  refreshKey: _refreshKey
}: UsageCardProps) {
  const { t, i18n } = useTranslation()

  // 使用 useMemo 快取計算結果，避免每次渲染重新計算
  const percentageValue = useMemo(
    () => Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 0,
    [percentage]
  )
  const percentageText = useMemo(
    () => percentageValue.toFixed(decimalPlaces),
    [percentageValue, decimalPlaces]
  )

  const { showPercent, showAbsolute } = useMemo(() => {
    const hasAbsoluteValues = remaining !== undefined && total !== undefined
    return {
      showPercent: valueFormat !== 'absolute' || !hasAbsoluteValues,
      showAbsolute: valueFormat !== 'percent' && hasAbsoluteValues
    }
  }, [valueFormat, remaining, total])

  // 使用 useCallback 快取事件處理函數，避免子元件不必要的重新渲染
  const handleVisibilityClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onVisibilityToggle?.(!isVisibleInOverview)
  }, [onVisibilityToggle, isVisibleInOverview])

  const handleCardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!onClick || (e.key !== 'Enter' && e.key !== ' ')) return
    e.preventDefault()
    onClick()
  }, [onClick])
  
  return (
    <Card 
      className={cn(
        radiusClasses[cardRadius],
        'min-w-0 overflow-hidden transition-[background-color,border-color,box-shadow] duration-150',
        onClick && 'cursor-pointer hover:border-primary/40 hover:bg-secondary hover:shadow-fluent-4',
        className
      )}
      onClick={onClick}
      onKeyDown={handleCardKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardContent className={cn('min-w-0', sizeClasses[cardSize])}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className={cn('truncate font-semibold leading-5', cardSize === 'compact' ? 'text-xs' : 'text-sm')}>
              {title}
            </h4>
            {subtitle && (
              <p className="truncate text-xs leading-4 text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-start gap-1">
            {showVisibilityToggle && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleVisibilityClick}
                className={cn(
                  '-mr-2 -mt-2 shadow-none',
                  isVisibleInOverview ? 'text-primary' : 'text-muted-foreground'
                )}
                title={isVisibleInOverview ? t('provider.hideFromOverview') : t('provider.showInOverview')}
                aria-label={isVisibleInOverview ? t('provider.hideFromOverview') : t('provider.showInOverview')}
              >
                {isVisibleInOverview ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
              </Button>
            )}
            {showPercent && (
              <span className={cn(
                'font-data font-semibold tracking-[-0.04em]',
                cardSize === 'compact' ? 'text-xl leading-7' : 'text-[28px] leading-9',
                getQuotaColor(percentageValue)
              )}>
                {percentageText}%
              </span>
            )}
          </div>
        </div>
        
        <Progress 
          value={percentageValue}
          className={cn('mb-3', cardSize === 'compact' ? 'h-1' : 'h-1.5')}
          indicatorClassName={cn(getProgressColor(percentageValue), progressStyleClasses[progressStyle])}
          aria-label={`${title}: ${percentageText}%`}
        />
        
        <div className="flex min-h-4 items-end justify-between gap-3 text-xs leading-4 text-muted-foreground">
          {showAbsolute && remaining !== undefined && total !== undefined ? (
            <span className="font-data">{remaining.toLocaleString()} / {total.toLocaleString()}</span>
          ) : (
            <span></span>
          )}
          
          {showResetTime && resetTime && (
            <span className="flex min-w-0 items-center gap-1 whitespace-nowrap text-right">
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              {formatResetTime(resetTime, t, timeFormat, i18n.resolvedLanguage || i18n.language)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
