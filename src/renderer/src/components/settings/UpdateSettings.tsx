import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, ExternalLink, Info, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUpdateStore } from '@/stores/useUpdateStore'

function formatRelativeTime(isoString: string | null): { key: string; count?: number } {
  if (!isoString) return { key: 'settings.update.never' }

  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return { key: 'settings.update.justNow' }
  if (diffMins < 60) return { key: 'settings.update.minutesAgo', count: diffMins }
  if (diffHours < 24) return { key: 'settings.update.hoursAgo', count: diffHours }
  return { key: 'settings.update.daysAgo', count: diffDays }
}

function formatDate(isoString: string | null): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function UpdateSettings() {
  const { t } = useTranslation()
  const {
    currentVersion,
    latestVersion,
    hasUpdate,
    publishedAt,
    isChecking,
    lastChecked,
    checkForUpdate,
    openReleasePage,
    initialize
  } = useUpdateStore()

  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!initialized) {
      initialize()
      setInitialized(true)
    }
  }, [initialize, initialized])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          {t('settings.update.title')}
        </CardTitle>
        <CardDescription>{t('settings.update.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Version */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-muted-foreground">
              {t('settings.update.currentVersion')}
            </span>
          </div>
          <span className="font-mono text-sm">v{currentVersion || '...'}</span>
        </div>

        {/* Latest Version */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-muted-foreground">
              {t('settings.update.latestVersion')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">
              {latestVersion ? `v${latestVersion}` : '...'}
            </span>
            {hasUpdate && (
              <span className="flex items-center gap-1 text-xs text-primary font-medium">
                <Sparkles className="h-3 w-3" />
                {t('settings.update.newVersion')}
              </span>
            )}
          </div>
        </div>

        {/* Published Date (when update available) */}
        {hasUpdate && publishedAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('settings.update.publishedAt')}
            </span>
            <span className="text-sm">{formatDate(publishedAt)}</span>
          </div>
        )}

        {/* Status Message */}
        {!hasUpdate && latestVersion && (
          <div className="text-sm text-muted-foreground text-center py-2">
            {t('settings.update.upToDate')}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkForUpdate}
            disabled={isChecking}
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? t('settings.update.checking') : t('settings.update.checkNow')}
          </Button>

          {hasUpdate && (
            <Button size="sm" onClick={openReleasePage} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              {t('settings.update.download')}
            </Button>
          )}
        </div>

        {/* Last Checked */}
        {lastChecked && (
          <div className="text-xs text-muted-foreground text-center">
            {(() => {
              const timeInfo = formatRelativeTime(lastChecked)
              const timeText = timeInfo.count !== undefined
                ? t(timeInfo.key, { count: timeInfo.count })
                : t(timeInfo.key)
              return t('settings.update.lastChecked', { time: timeText })
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
