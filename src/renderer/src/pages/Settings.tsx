import { useCallback, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings as SettingsIcon, Globe, RotateCcw, Minimize, Plus, X } from 'lucide-react'
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
import type { NotificationThreshold } from '@shared/types/settings'
import { DEFAULT_NOTIFICATION_THRESHOLDS } from '@shared/types/settings'

export function Settings() {
  const { t, i18n } = useTranslation()
  const { settings, updateSettings } = useSettingsStore()
  const { lock } = useAuthStore()
  const { resetAll } = useCustomizationStore()

  const [localValues, setLocalValues] = useState({
    refreshInterval: settings.refreshInterval,
    lowQuotaThreshold: settings.lowQuotaThreshold
  })

  // Notification thresholds state
  const [thresholds, setThresholds] = useState<NotificationThreshold[]>(
    settings.notificationThresholds || DEFAULT_NOTIFICATION_THRESHOLDS
  )

  // Auto launch state
  const [isWindows, setIsWindows] = useState(false)
  const [autoLaunch, setAutoLaunch] = useState(false)

const handleSettingChange = useCallback(async (newSettings: Partial<typeof settings>) => {
    // Reset notification state when thresholds change
    if (newSettings.notificationThresholds !== undefined) {
      await window.api.notification.resetState()
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
      lowQuotaThreshold: settings.lowQuotaThreshold
    })
    setThresholds(settings.notificationThresholds || [
      { value: 25, enabled: true },
      { value: 10, enabled: true },
      { value: 5, enabled: true }
    ])
  }, [settings.refreshInterval, settings.lowQuotaThreshold, settings.notificationThresholds])

  // Initialize auto launch state
  useEffect(() => {
    const initAutoLaunch = async () => {
      try {
        const platform = await window.api.app.getPlatform()
        setIsWindows(platform === 'win32')
        
        if (platform === 'win32') {
          const enabled = await window.api.app.getAutoLaunch()
          setAutoLaunch(enabled)
        }
      } catch {
        // Silently fail
      }
    }
    initAutoLaunch()
  }, [])

  const handleAutoLaunchChange = async (checked: boolean) => {
    try {
      const success = await window.api.app.setAutoLaunch(checked)
      if (success) {
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

            {settings.notifications && (
              <div className="space-y-3 pt-2 border-t">
                <div>
                  <Label>{t('settings.notificationThresholds')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.notificationThresholdsDesc')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  {thresholds.map((threshold, index) => {
                    // 預設名稱使用 i18n 翻譯
                    const defaultNames = [
                      t('settings.thresholdWarning'),
                      t('settings.thresholdUrgent'),
                      t('settings.thresholdCritical')
                    ]
                    const defaultName = defaultNames[index] || `${t('settings.customThreshold')} #${index - 2}`
                    
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <Switch
                          checked={threshold.enabled}
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
                          onChange={(e) => {
                            const newThresholds = [...thresholds]
                            newThresholds[index] = { ...threshold, name: e.target.value }
                            setThresholds(newThresholds)
                            handleSettingChange({ notificationThresholds: newThresholds })
                          }}
                          className="w-24"
                          disabled={!threshold.enabled}
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">≤</span>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={threshold.value}
                            onChange={(e) => {
                              const newThresholds = [...thresholds]
                              newThresholds[index] = { ...threshold, value: Number(e.target.value) }
                              setThresholds(newThresholds)
                              handleSettingChange({ notificationThresholds: newThresholds })
                            }}
                            className="w-20"
                            disabled={!threshold.enabled}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        {thresholds.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newThresholds = thresholds.filter((_, i) => i !== index)
                              setThresholds(newThresholds)
                              handleSettingChange({ notificationThresholds: newThresholds })
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex gap-2">
                  {thresholds.length < 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const minValue = Math.min(...thresholds.map(t => t.value))
                        const newValue = Math.max(1, minValue - 5)
                        const customCount = thresholds.filter(th =>
                          th.name?.startsWith(t('settings.customThreshold'))
                        ).length + 1
                        const newThresholds = [
                          ...thresholds,
                          {
                            value: newValue,
                            enabled: true,
                            name: `${t('settings.customThreshold')} #${customCount}`
                          }
                        ]
                        setThresholds(newThresholds)
                        handleSettingChange({ notificationThresholds: newThresholds })
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('settings.addThreshold')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setThresholds(DEFAULT_NOTIFICATION_THRESHOLDS)
                      handleSettingChange({ notificationThresholds: DEFAULT_NOTIFICATION_THRESHOLDS })
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    {t('settings.resetThresholds')}
                  </Button>
                </div>
              </div>
            )}
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

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoLaunch" className={!isWindows ? 'text-muted-foreground' : ''}>
                  {t('settings.autoLaunch')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isWindows ? t('settings.autoLaunchDesc') : t('settings.autoLaunchUnsupported')}
                </p>
              </div>
              <Switch
                id="autoLaunch"
                checked={autoLaunch}
                onCheckedChange={handleAutoLaunchChange}
                disabled={!isWindows}
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
