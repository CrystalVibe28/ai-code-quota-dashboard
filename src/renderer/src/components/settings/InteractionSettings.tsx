import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SettingsSelect } from '@/components/settings/SettingsSelect'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { MousePointerClick } from 'lucide-react'

export function InteractionSettings() {
  const { t } = useTranslation()
  const { global, updateGlobal } = useCustomizationStore()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MousePointerClick className="h-5 w-5" />
          {t('customization.interaction.title')}
        </CardTitle>
        <CardDescription>{t('customization.interaction.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="fluent-setting-row">
          <div>
            <Label htmlFor="cardClickAction">{t('customization.interaction.cardClick')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.interaction.cardClickDesc')}
            </p>
          </div>
          <SettingsSelect
            id="cardClickAction"
            value={global.cardClickAction}
            onValueChange={(value) => updateGlobal({ cardClickAction: value as 'none' | 'detail' | 'copy' })}
            options={[
              { value: 'none', label: t('customization.interaction.clickOptions.none') },
              { value: 'detail', label: t('customization.interaction.clickOptions.detail') },
              { value: 'copy', label: t('customization.interaction.clickOptions.copy') }
            ]}
          />
        </div>

        <div className="fluent-setting-row">
          <div>
            <Label htmlFor="keyboardShortcuts">{t('customization.interaction.shortcuts')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.interaction.shortcutsDesc')}
            </p>
          </div>
          <Switch
            id="keyboardShortcuts"
            checked={global.keyboardShortcuts}
            onCheckedChange={(checked) => updateGlobal({ keyboardShortcuts: checked })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
