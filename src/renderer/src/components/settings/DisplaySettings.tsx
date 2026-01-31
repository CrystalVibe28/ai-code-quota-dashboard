import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { Eye } from 'lucide-react'

export function DisplaySettings() {
  const { t } = useTranslation()
  const { global, updateGlobal } = useCustomizationStore()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          {t('customization.display.title')}
        </CardTitle>
        <CardDescription>{t('customization.display.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="showOnlyLowQuota">{t('customization.display.showOnlyLowQuota')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.display.showOnlyLowQuotaDesc')}
            </p>
          </div>
          <Switch
            id="showOnlyLowQuota"
            checked={global.showOnlyLowQuota}
            onCheckedChange={(checked) => updateGlobal({ showOnlyLowQuota: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="hideUnlimitedQuota">{t('customization.display.hideUnlimited')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.display.hideUnlimitedDesc')}
            </p>
          </div>
          <Switch
            id="hideUnlimitedQuota"
            checked={global.hideUnlimitedQuota}
            onCheckedChange={(checked) => updateGlobal({ hideUnlimitedQuota: checked })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
