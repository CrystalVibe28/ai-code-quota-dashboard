import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn, getProgressColor, getQuotaColor, formatResetTime } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, Eye, EyeOff } from 'lucide-react'
import type { CardSize, ProgressStyle, ValueFormat, CardRadius } from '@/types/customization'

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
  showResetTime?: boolean
  cardRadius?: CardRadius
  onClick?: () => void
  showVisibilityToggle?: boolean
  isVisibleInOverview?: boolean
  onVisibilityToggle?: (visible: boolean) => void
}

const sizeClasses: Record<CardSize, string> = {
  compact: 'p-3',
  default: 'pt-4',
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
  showResetTime = true,
  cardRadius = 'md',
  onClick,
  showVisibilityToggle = false,
  isVisibleInOverview = true,
  onVisibilityToggle
}: UsageCardProps) {
  const { t } = useTranslation()

  // 使用 useMemo 快取計算結果，避免每次渲染重新計算
  const percentageInt = useMemo(() => Math.round(percentage), [percentage])

  const { showPercent, showAbsolute } = useMemo(() => ({
    showPercent: valueFormat === 'percent' || valueFormat === 'both',
    showAbsolute: (valueFormat === 'absolute' || valueFormat === 'both') && remaining !== undefined
  }), [valueFormat, remaining])

  // 使用 useCallback 快取事件處理函數，避免子元件不必要的重新渲染
  const handleVisibilityClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onVisibilityToggle?.(!isVisibleInOverview)
  }, [onVisibilityToggle, isVisibleInOverview])
  
  return (
    <Card 
      className={cn(radiusClasses[cardRadius], onClick && 'cursor-pointer hover:bg-accent/50 transition-colors', className)}
      onClick={onClick}
    >
      <CardContent className={sizeClasses[cardSize]}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h4 className={cn('font-medium truncate', cardSize === 'compact' ? 'text-xs' : 'text-sm')}>
              {title}
            </h4>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {showVisibilityToggle && (
              <button
                onClick={handleVisibilityClick}
                className={cn(
                  'p-1 rounded hover:bg-accent transition-colors',
                  isVisibleInOverview ? 'text-primary' : 'text-muted-foreground'
                )}
                title={isVisibleInOverview ? t('provider.hideFromOverview') : t('provider.showInOverview')}
              >
                {isVisibleInOverview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            )}
            {showPercent && (
              <span className={cn(
                'font-bold',
                cardSize === 'compact' ? 'text-lg' : 'text-2xl',
                getQuotaColor(percentageInt)
              )}>
                {percentageInt}%
              </span>
            )}
          </div>
        </div>
        
        <Progress 
          value={percentageInt} 
          className={cn('mb-2', cardSize === 'compact' ? 'h-1.5' : 'h-2')}
          indicatorClassName={cn(getProgressColor(percentageInt), progressStyleClasses[progressStyle])}
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          {showAbsolute && remaining !== undefined && total !== undefined ? (
            <span>{remaining.toLocaleString()} / {total.toLocaleString()}</span>
          ) : (
            <span></span>
          )}
          
          {showResetTime && resetTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatResetTime(resetTime, t)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
