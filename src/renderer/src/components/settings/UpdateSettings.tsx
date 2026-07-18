import { useTranslation } from 'react-i18next'
import { RefreshCw, ExternalLink, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUpdateStore } from '@/stores/useUpdateStore'

function formatFixedTime(isoString: string | null): string {
  if (!isoString) return ''
  return new Date(isoString).toLocaleString()
}

export function UpdateSettings() {
  const { t } = useTranslation()
  const {
    currentVersion,
    latestVersion,
    hasUpdate,
    isChecking,
    downloadState,
    downloadProgress,
    lastChecked,
    error,
    checkForUpdate,
    openReleasePage,
    startUpdate
  } = useUpdateStore()

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
        <div className="space-y-3 rounded-md bg-secondary/50 p-3">
          {/* Current Version */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium leading-none">{t('settings.update.currentVersion')}</span>
            <span className="font-data text-sm text-muted-foreground">v{currentVersion || '...'}</span>
          </div>

          {/* Latest Version */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium leading-none">{t('settings.update.latestVersion')}</span>
            <div className="flex items-center gap-2">
              {hasUpdate && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {t('settings.update.newVersion')}
                </span>
              )}
              <span className="font-data text-sm text-muted-foreground">
                {latestVersion ? `v${latestVersion}` : '...'}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {t('settings.update.updateFailed', { error })}
          </p>
        )}

        {/* Footer Actions - Fixed Height Container to prevent layout shift */}
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {lastChecked && t('settings.update.lastChecked', { time: formatFixedTime(lastChecked) })}
          </div>

          <div className="flex gap-2">
            {hasUpdate && downloadState === 'downloaded' && (
              <Button size="sm" onClick={startUpdate}>
                <RefreshCw aria-hidden="true" />
                {t('settings.update.startUpdate')}
              </Button>
            )}
            {hasUpdate && downloadState === 'downloading' && (
              <Button size="sm" disabled>
                <RefreshCw className="animate-spin" aria-hidden="true" />
                {t('settings.update.downloading', { percent: downloadProgress })}
              </Button>
            )}
            {hasUpdate && downloadState === 'installing' && (
              <Button size="sm" disabled>
                <RefreshCw className="animate-spin" aria-hidden="true" />
                {t('settings.update.installing')}
              </Button>
            )}
            {hasUpdate && (downloadState === 'idle' || downloadState === 'error') && (
              <Button size="sm" onClick={openReleasePage}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('settings.update.download')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={checkForUpdate}
              disabled={isChecking || (downloadState !== 'idle' && downloadState !== 'error')}
            >
              <RefreshCw className={isChecking ? 'animate-spin' : ''} aria-hidden="true" />
              {isChecking ? t('settings.update.checking') : t('settings.update.checkNow')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
