import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw, ExternalLink, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUpdateStore } from '@/stores/useUpdateStore'

function formatFixedTime(isoString: string | null): string {
  if (!isoString) return ''
  return new Date(isoString).toLocaleString()
}

interface Props {
  required?: boolean
}

export function UpdateSettings({ required = false }: Props) {
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
    initialize,
    openReleasePage,
    startUpdate
  } = useUpdateStore()

  useEffect(() => {
    if (!required) return

    let cleanup: (() => void) | undefined
    let cancelled = false
    void checkForUpdate().finally(() => {
      if (!cancelled) cleanup = initialize()
    })
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [checkForUpdate, initialize, required])

  const UpdateIcon = required ? AlertTriangle : Info

  return (
    <Card
      className={required ? 'border-primary/30 shadow-fluent-16' : undefined}
      role={required ? 'alert' : undefined}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UpdateIcon
            aria-hidden="true"
            className={required ? 'h-5 w-5 text-primary' : 'h-5 w-5'}
          />
          {t(required ? 'settings.update.requiredTitle' : 'settings.update.title')}
        </CardTitle>
        <CardDescription>
          {t(required ? 'settings.update.requiredDescription' : 'settings.update.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {required && (
          <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            {t('settings.update.dataSafe')}
          </p>
        )}
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
            {(hasUpdate || required) && (downloadState === 'idle' || downloadState === 'error') && (
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
