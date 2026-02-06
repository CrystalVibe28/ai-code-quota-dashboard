import { useEffect, useState } from 'react'
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
        <div className="space-y-3">
          {/* Current Version */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium leading-none">{t('settings.update.currentVersion')}</span>
            <span className="font-mono text-sm text-muted-foreground">v{currentVersion || '...'}</span>
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
              <span className="font-mono text-sm text-muted-foreground">
                {latestVersion ? `v${latestVersion}` : '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions - Fixed Height Container to prevent layout shift */}
        <div className="flex items-center justify-between pt-2 h-10">
          <div className="text-xs text-muted-foreground">
            {lastChecked && t('settings.update.lastChecked', { time: formatFixedTime(lastChecked) })}
          </div>

          <div className="flex gap-2">
            {hasUpdate && (
              <Button size="sm" onClick={openReleasePage}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('settings.update.download')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={checkForUpdate}
              disabled={isChecking}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isChecking ? t('settings.update.checking') : t('settings.update.checkNow')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
