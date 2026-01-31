import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="cardClickAction">{t('customization.interaction.cardClick')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.interaction.cardClickDesc')}
            </p>
          </div>
          <select
            id="cardClickAction"
            value={global.cardClickAction}
            onChange={(e) => updateGlobal({ cardClickAction: e.target.value as 'none' | 'detail' | 'copy' })}
            className="w-32 bg-background border border-input rounded-md px-3 py-2 text-sm"
          >
            <option value="none">{t('customization.interaction.clickOptions.none')}</option>
            <option value="detail">{t('customization.interaction.clickOptions.detail')}</option>
            <option value="copy">{t('customization.interaction.clickOptions.copy')}</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
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
