import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="valueFormat">{t('customization.data.valueFormat')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.data.valueFormatDesc')}
            </p>
          </div>
          <select
            id="valueFormat"
            value={global.valueFormat}
            onChange={(e) => updateGlobal({ valueFormat: e.target.value as 'percent' | 'absolute' | 'both' })}
            className="w-32 bg-background border border-input rounded-md px-3 py-2 text-sm"
          >
            <option value="percent">{t('customization.data.valueOptions.percent')}</option>
            <option value="absolute">{t('customization.data.valueOptions.absolute')}</option>
            <option value="both">{t('customization.data.valueOptions.both')}</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="decimalPlaces">{t('customization.data.decimalPlaces')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.data.decimalPlacesDesc')}
            </p>
          </div>
          <select
            id="decimalPlaces"
            value={global.decimalPlaces}
            onChange={(e) => updateGlobal({ decimalPlaces: Number(e.target.value) as 0 | 1 | 2 })}
            className="w-32 bg-background border border-input rounded-md px-3 py-2 text-sm"
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="timeFormat">{t('customization.data.timeFormat')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.data.timeFormatDesc')}
            </p>
          </div>
          <select
            id="timeFormat"
            value={global.timeFormat}
            onChange={(e) => updateGlobal({ timeFormat: e.target.value as 'relative' | 'absolute' })}
            className="w-32 bg-background border border-input rounded-md px-3 py-2 text-sm"
          >
            <option value="relative">{t('customization.data.timeOptions.relative')}</option>
            <option value="absolute">{t('customization.data.timeOptions.absolute')}</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
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
