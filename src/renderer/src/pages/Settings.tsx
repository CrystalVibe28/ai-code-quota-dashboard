import { useCallback, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings as SettingsIcon, Globe, RotateCcw, Minimize } from 'lucide-react'
import { debounce } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { SUPPORTED_LANGUAGES } from '@/i18n'
import { VisualSettings } from '@/components/settings/VisualSettings'
import { LayoutSettings } from '@/components/settings/LayoutSettings'
import { DisplaySettings } from '@/components/settings/DisplaySettings'
import { DataSettings } from '@/components/settings/DataSettings'
import { InteractionSettings } from '@/components/settings/InteractionSettings'

export function Settings() {
  const { t, i18n } = useTranslation()
  const { settings, updateSettings } = useSettingsStore()
  const { lock } = useAuthStore()
  const { resetAll } = useCustomizationStore()

  const [localValues, setLocalValues] = useState({
    refreshInterval: settings.refreshInterval,
    lowQuotaThreshold: settings.lowQuotaThreshold,
    notificationReminderInterval: settings.notificationReminderInterval
  })

  const handleSettingChange = useCallback(async (newSettings: Partial<typeof settings>) => {
    const oldThreshold = settings.lowQuotaThreshold
    if (newSettings.lowQuotaThreshold !== undefined && newSettings.lowQuotaThreshold !== oldThreshold) {
      await window.api.notification.resetState()
    }

    const oldInterval = settings.notificationReminderInterval
    if (newSettings.notificationReminderInterval !== undefined && newSettings.notificationReminderInterval !== oldInterval) {
      await window.api.notification.restartTimer()
    }

    const oldRefreshInterval = settings.refreshInterval
    if (newSettings.refreshInterval !== undefined && newSettings.refreshInterval !== oldRefreshInterval) {
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
    setLocalValues({
      refreshInterval: settings.refreshInterval,
      lowQuotaThreshold: settings.lowQuotaThreshold,
      notificationReminderInterval: settings.notificationReminderInterval
    })
  }, [settings.refreshInterval, settings.lowQuotaThreshold, settings.notificationReminderInterval])

  const handleLanguageChange = async (lang: string) => {
    i18n.changeLanguage(lang)
    await updateSettings({ language: lang })
  }

  const handleClearData = async () => {
    if (confirm(t('settings.clearDataConfirm'))) {
      await lock()
    }
  }

  const handleResetCustomization = () => {
    if (confirm(t('customization.resetConfirm'))) {
      resetAll()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('settings.subtitle')}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleResetCustomization}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('customization.resetAll')}
        </Button>
      </div>

      <div className="grid gap-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.refreshSettings')}</CardTitle>
            <CardDescription>{t('settings.refreshSettingsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="refreshInterval">{t('settings.refreshInterval')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.refreshIntervalDesc')}
                </p>
              </div>
              <Input
                id="refreshInterval"
                type="number"
                min={30}
                max={300}
                value={localValues.refreshInterval}
                onChange={(e) => handleInputChange('refreshInterval', Number(e.target.value))}
                className="w-24"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.quotaAlerts')}</CardTitle>
            <CardDescription>{t('settings.quotaAlertsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="lowQuotaThreshold">{t('settings.lowQuotaThreshold')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.lowQuotaThresholdDesc')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="lowQuotaThreshold"
                  type="number"
                  min={1}
                  max={50}
                  value={localValues.lowQuotaThreshold}
                  onChange={(e) => handleInputChange('lowQuotaThreshold', Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications">{t('settings.notifications')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.notificationsDesc')}
                </p>
              </div>
              <Switch
                id="notifications"
                checked={settings.notifications}
                onCheckedChange={(checked) => handleSettingChange({ notifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notificationReminderInterval">{t('settings.notificationReminderInterval')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.notificationReminderIntervalDesc')}
                </p>
              </div>
              <Input
                id="notificationReminderInterval"
                type="number"
                min={0}
                max={120}
                value={localValues.notificationReminderInterval}
                onChange={(e) => handleInputChange('notificationReminderInterval', Number(e.target.value))}
                className="w-24"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('settings.language')}
            </CardTitle>
            <CardDescription>{t('settings.languageDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={settings.language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Minimize className="h-5 w-5" />
              {t('settings.traySettings')}
            </CardTitle>
            <CardDescription>{t('settings.traySettingsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="closeToTray">{t('settings.closeToTray')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.closeToTrayDesc')}
                </p>
              </div>
              <Switch
                id="closeToTray"
                checked={settings.closeToTray}
                onCheckedChange={(checked) => handleSettingChange({ closeToTray: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <VisualSettings />
        <LayoutSettings />
        <DisplaySettings />
        <DataSettings />
        <InteractionSettings />

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.dangerZone')}</CardTitle>
            <CardDescription>{t('settings.dangerZoneDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleClearData}>
              {t('settings.clearAllData')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
