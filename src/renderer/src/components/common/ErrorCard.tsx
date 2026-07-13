import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { CardSize, CardRadius } from '@/types/customization'

interface ErrorCardProps {
  title: string
  subtitle?: string
  errorMessage?: string
  className?: string
  cardSize?: CardSize
  cardRadius?: CardRadius
  onRetry?: () => void
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

export const ErrorCard = memo(function ErrorCard({
  title,
  subtitle,
  errorMessage,
  className,
  cardSize = 'default',
  cardRadius = 'md',
  onRetry
}: ErrorCardProps) {
  const { t } = useTranslation()

  return (
    <Card
      className={cn(radiusClasses[cardRadius], 'border-destructive/40', className)}
    >
      <CardContent className={sizeClasses[cardSize]}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className={cn('truncate font-semibold leading-5', cardSize === 'compact' ? 'text-xs' : 'text-sm')}>
              {title}
            </h4>
            {subtitle && (
              <p className="truncate text-xs leading-4 text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <span className={cn('flex items-center', cardSize === 'compact' ? 'h-7' : 'h-8')}>
              <AlertTriangle aria-hidden="true" className={cn(
                'text-destructive',
                cardSize === 'compact' ? 'h-5 w-5' : 'h-6 w-6'
              )} />
            </span>
          </div>
        </div>

        <div className={cn(
          'mb-3 rounded-full bg-destructive/20',
          cardSize === 'compact' ? 'h-1' : 'h-1.5'
        )} />

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span className="text-destructive truncate flex-1 mr-2">
            {errorMessage || t('errors.unknown')}
          </span>
          {onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-auto min-h-0 flex-shrink-0 px-2 py-1 text-xs shadow-none"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              {t('common.retry')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
