import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Minimize, Plus, RotateCcw, Settings as SettingsIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AiStudioOAuthSettings } from '@/components/settings/AiStudioOAuthSettings'
import { DataSettings } from '@/components/settings/DataSettings'
import { DisplaySettings } from '@/components/settings/DisplaySettings'
import { InteractionSettings } from '@/components/settings/InteractionSettings'
import { LayoutSettings } from '@/components/settings/LayoutSettings'
import { SecuritySettings } from '@/components/settings/SecuritySettings'
import { SettingsSelect } from '@/components/settings/SettingsSelect'
import { UpdateSettings } from '@/components/settings/UpdateSettings'
import { VisualSettings } from '@/components/settings/VisualSettings'
import { useAuthStore } from '@/stores/useAuthStore'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { SUPPORTED_LANGUAGES } from '@/i18n'
import { DEFAULT_NOTIFICATION_THRESHOLDS } from '@shared/types/settings'
import type { NotificationThreshold } from '@shared/types/settings'
import { debounce } from '@/lib/utils'

interface SettingsSectionProps {
  id: string
  title: string
  children: ReactNode
}

function SettingsSection({ id, title, children }: SettingsSectionProps) {
  return (
    <section className="space-y-4" aria-labelledby={id}>
      <h2 id={id} className="text-xl font-semibold leading-[26px]">{title}</h2>
      {children}
    </section>
  )
}

export function Settings() {
  const { t, i18n } = useTranslation()
  const { settings, updateSettings } = useSettingsStore()
  const { clearAllData } = useAuthStore()
  const { resetAll } = useCustomizationStore()

  const [localValues, setLocalValues] = useState({
    refreshInterval: settings.refreshInterval
  })
  const [thresholds, setThresholds] = useState<NotificationThreshold[]>(
    settings.notificationThresholds || DEFAULT_NOTIFICATION_THRESHOLDS
  )
  const [autoLaunch, setAutoLaunch] = useState(false)

  const handleSettingChange = useCallback(async (newSettings: Partial<typeof settings>) => {
    if (newSettings.notificationThresholds !== undefined) {
      await window.api.notification.resetState()
    }

    if (newSettings.refreshInterval !== undefined && newSettings.refreshInterval !== settings.refreshInterval) {
      await window.api.app.refreshIntervalChanged()
    }

    updateSettings(newSettings)
  }, [settings, updateSettings])

  const debouncedHandleSettingChange = useCallback(debounce(handleSettingChange, 300), [handleSettingChange])

  const handleInputChange = useCallback((field: keyof typeof localValues, value: number) => {
    setLocalValues(prev => ({ ...prev, [field]: value }))
    debouncedHandleSettingChange({ [field]: value })
  }, [debouncedHandleSettingChange])

  useEffect(() => {
    setLocalValues({ refreshInterval: settings.refreshInterval })
    setThresholds(settings.notificationThresholds || DEFAULT_NOTIFICATION_THRESHOLDS)
  }, [settings.refreshInterval, settings.notificationThresholds])

  useEffect(() => {
    const initAutoLaunch = async () => {
      try {
        setAutoLaunch(await window.api.app.getAutoLaunch())
      } catch {
        // Silently fail
      }
    }
    initAutoLaunch()
  }, [])

  const handleAutoLaunchChange = async (checked: boolean) => {
    try {
      if (await window.api.app.setAutoLaunch(checked)) {
        setAutoLaunch(checked)
      }
    } catch {
      // Silently fail
    }
  }

  const handleLanguageChange = async (lang: string) => {
    i18n.changeLanguage(lang)
    await updateSettings({ language: lang })
  }

  const handleClearData = async () => {
    if (confirm(t('settings.clearDataConfirm'))) {
      await clearAllData()
    }
  }

  const handleResetCustomization = () => {
    if (confirm(t('customization.resetConfirm'))) {
      resetAll()
    }
  }

  return (
    <div className="fluent-page space-y-8">
      <header className="fluent-page-header">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <SettingsIcon className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="fluent-page-title">{t('settings.title')}</h1>
        </div>
        <Button variant="outline" onClick={handleResetCustomization}>
          <RotateCcw aria-hidden="true" />
          {t('customization.resetAll')}
        </Button>
      </header>

      <SettingsSection
        id="settings-system"
        title={t('settings.sections.system')}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.refreshSettings')}</CardTitle>
              <CardDescription>{t('settings.refreshSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="fluent-setting-row">
                <div>
                  <Label htmlFor="refreshInterval">{t('settings.refreshInterval')}</Label>
                  <p id="refresh-interval-description" className="text-sm leading-5 text-muted-foreground">
                    {t('settings.refreshIntervalDesc')}
                  </p>
                </div>
                <Input
                  id="refreshInterval"
                  type="number"
                  inputMode="numeric"
                  min={30}
                  max={300}
                  value={localValues.refreshInterval}
                  onChange={(event) => handleInputChange('refreshInterval', Number(event.target.value))}
                  className="w-full sm:w-28"
                  aria-describedby="refresh-interval-description"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" aria-hidden="true" />
                {t('settings.language')}
              </CardTitle>
              <CardDescription>{t('settings.languageDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsSelect
                id="language"
                value={settings.language}
                onValueChange={handleLanguageChange}
                className="sm:w-full"
                options={SUPPORTED_LANGUAGES.map((language) => ({
                  value: language.code,
                  label: language.nativeName
                }))}
              />
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Minimize className="h-5 w-5" aria-hidden="true" />
                {t('settings.traySettings')}
              </CardTitle>
              <CardDescription>{t('settings.traySettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              <div className="fluent-setting-row pb-4">
                <div>
                  <Label htmlFor="closeToTray">{t('settings.closeToTray')}</Label>
                  <p className="text-sm leading-5 text-muted-foreground">{t('settings.closeToTrayDesc')}</p>
                </div>
                <Switch
                  id="closeToTray"
                  checked={settings.closeToTray}
                  onCheckedChange={(checked) => handleSettingChange({ closeToTray: checked })}
                />
              </div>
              <div className="fluent-setting-row pt-4">
                <div>
                  <Label htmlFor="autoLaunch">{t('settings.autoLaunch')}</Label>
                  <p className="text-sm leading-5 text-muted-foreground">{t('settings.autoLaunchDesc')}</p>
                </div>
                <Switch id="autoLaunch" checked={autoLaunch} onCheckedChange={handleAutoLaunchChange} />
              </div>
            </CardContent>
          </Card>
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-connections"
        title={t('settings.sections.connections')}
      >
        <AiStudioOAuthSettings />
      </SettingsSection>

      <SettingsSection
        id="settings-alerts"
        title={t('settings.sections.alerts')}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.quotaAlerts')}</CardTitle>
            <CardDescription>{t('settings.quotaAlertsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="fluent-setting-row">
              <div>
                <Label htmlFor="notifications">{t('settings.notifications')}</Label>
                <p className="text-sm leading-5 text-muted-foreground">{t('settings.notificationsDesc')}</p>
              </div>
              <Switch
                id="notifications"
                checked={settings.notifications}
                onCheckedChange={(checked) => handleSettingChange({ notifications: checked })}
              />
            </div>

            {settings.notifications && (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <Label>{t('settings.notificationThresholds')}</Label>
                  <p className="text-sm leading-5 text-muted-foreground">{t('settings.notificationThresholdsDesc')}</p>
                </div>

                <div className="space-y-2">
                  {thresholds.map((threshold, index) => {
                    const defaultNames = [
                      t('settings.thresholdWarning'),
                      t('settings.thresholdUrgent'),
                      t('settings.thresholdCritical')
                    ]
                    const defaultName = defaultNames[index] || `${t('settings.customThreshold')} #${index - 2}`

                    return (
                      <div key={index} className="flex flex-wrap items-center gap-3 rounded-md border bg-secondary/50 p-3">
                        <Switch
                          id={`notification-threshold-${index}`}
                          checked={threshold.enabled}
                          aria-label={`${defaultName} ${t('settings.notifications')}`}
                          onCheckedChange={(checked) => {
                            const newThresholds = [...thresholds]
                            newThresholds[index] = { ...threshold, enabled: checked }
                            setThresholds(newThresholds)
                            handleSettingChange({ notificationThresholds: newThresholds })
                          }}
                        />
                        <Input
                          type="text"
                          value={threshold.name ?? ''}
                          placeholder={defaultName}
                          aria-label={t('settings.thresholdNamePlaceholder')}
                          onChange={(event) => {
                            const newThresholds = [...thresholds]
                            newThresholds[index] = { ...threshold, name: event.target.value }
                            setThresholds(newThresholds)
                          }}
                          onBlur={() => handleSettingChange({ notificationThresholds: thresholds })}
                          className="min-w-32 flex-1 sm:max-w-48"
                          disabled={!threshold.enabled}
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">≤</span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={100}
                            value={threshold.value}
                            aria-label={t('settings.thresholdValue')}
                            onChange={(event) => {
                              const newThresholds = [...thresholds]
                              newThresholds[index] = { ...threshold, value: Number(event.target.value) }
                              setThresholds(newThresholds)
                            }}
                            onBlur={() => handleSettingChange({ notificationThresholds: thresholds })}
                            className="w-20"
                            disabled={!threshold.enabled}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        {thresholds.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground shadow-none hover:text-destructive"
                            aria-label={t('settings.removeThreshold')}
                            onClick={() => {
                              const newThresholds = thresholds.filter((_, itemIndex) => itemIndex !== index)
                              setThresholds(newThresholds)
                              handleSettingChange({ notificationThresholds: newThresholds })
                            }}
                          >
                            <X aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {thresholds.length < 5 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const minValue = Math.min(...thresholds.map(threshold => threshold.value))
                        const customCount = thresholds.filter(threshold =>
                          threshold.name?.startsWith(t('settings.customThreshold'))
                        ).length + 1
                        const newThresholds = [
                          ...thresholds,
                          {
                            value: Math.max(1, minValue - 5),
                            enabled: true,
                            name: `${t('settings.customThreshold')} #${customCount}`
                          }
                        ]
                        setThresholds(newThresholds)
                        handleSettingChange({ notificationThresholds: newThresholds })
                      }}
                    >
                      <Plus aria-hidden="true" />
                      {t('settings.addThreshold')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setThresholds(DEFAULT_NOTIFICATION_THRESHOLDS)
                      handleSettingChange({ notificationThresholds: DEFAULT_NOTIFICATION_THRESHOLDS })
                    }}
                  >
                    <RotateCcw aria-hidden="true" />
                    {t('settings.resetThresholds')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection
        id="settings-appearance"
        title={t('settings.sections.appearance')}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <VisualSettings />
          <LayoutSettings />
          <div className="xl:col-span-2">
            <DataSettings />
          </div>
          <DisplaySettings />
          <InteractionSettings />
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-privacy"
        title={t('settings.sections.privacy')}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <SecuritySettings />
          <UpdateSettings />
        </div>
      </SettingsSection>

      <Card className="border-destructive/30 shadow-none">
        <CardHeader>
          <CardTitle className="text-destructive">{t('settings.dangerZone')}</CardTitle>
          <CardDescription>{t('settings.dangerZoneDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleClearData}>
            {t('settings.clearAllData')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
