import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SettingsSelect } from '@/components/settings/SettingsSelect'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { BarChart3 } from 'lucide-react'

export function DataSettings() {
  const { t } = useTranslation()
  const { global, updateGlobal } = useCustomizationStore()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {t('customization.data.title')}
        </CardTitle>
        <CardDescription>{t('customization.data.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="fluent-setting-row">
          <div>
            <Label htmlFor="valueFormat">{t('customization.data.valueFormat')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.data.valueFormatDesc')}
            </p>
          </div>
          <SettingsSelect
            id="valueFormat"
            value={global.valueFormat}
            onValueChange={(value) => updateGlobal({ valueFormat: value as 'percent' | 'absolute' | 'both' })}
            options={[
              { value: 'percent', label: t('customization.data.valueOptions.percent') },
              { value: 'absolute', label: t('customization.data.valueOptions.absolute') },
              { value: 'both', label: t('customization.data.valueOptions.both') }
            ]}
          />
        </div>

        <div className="fluent-setting-row">
          <div>
            <Label htmlFor="decimalPlaces">{t('customization.data.decimalPlaces')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.data.decimalPlacesDesc')}
            </p>
          </div>
          <SettingsSelect
            id="decimalPlaces"
            value={String(global.decimalPlaces)}
            onValueChange={(value) => updateGlobal({ decimalPlaces: Number(value) as 0 | 1 | 2 })}
            options={[0, 1, 2].map((value) => ({ value: String(value), label: String(value) }))}
          />
        </div>

        <div className="fluent-setting-row">
          <div>
            <Label htmlFor="timeFormat">{t('customization.data.timeFormat')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.data.timeFormatDesc')}
            </p>
          </div>
          <SettingsSelect
            id="timeFormat"
            value={global.timeFormat}
            onValueChange={(value) => updateGlobal({ timeFormat: value as 'relative' | 'absolute' })}
            options={[
              { value: 'relative', label: t('customization.data.timeOptions.relative') },
              { value: 'absolute', label: t('customization.data.timeOptions.absolute') }
            ]}
          />
        </div>

        <div className="fluent-setting-row">
          <div>
            <Label htmlFor="showResetTime">{t('customization.data.showResetTime')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.data.showResetTimeDesc')}
            </p>
          </div>
          <Switch
            id="showResetTime"
            checked={global.showResetTime}
            onCheckedChange={(checked) => updateGlobal({ showResetTime: checked })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
