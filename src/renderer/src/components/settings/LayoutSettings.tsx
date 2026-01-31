import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { GRID_COLUMN_OPTIONS, CARD_SIZE_OPTIONS } from '@/constants/customization'
import { LayoutGrid } from 'lucide-react'

export function LayoutSettings() {
  const { t } = useTranslation()
  const { global, updateGlobal } = useCustomizationStore()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" />
          {t('customization.layout.title')}
        </CardTitle>
        <CardDescription>{t('customization.layout.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="gridColumns">{t('customization.layout.gridColumns')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.layout.gridColumnsDesc')}
            </p>
          </div>
          <select
            id="gridColumns"
            value={String(global.gridColumns)}
            onChange={(e) => {
              const val = e.target.value
              updateGlobal({ gridColumns: val === 'auto' ? 'auto' : Number(val) as 1|2|3|4 })
            }}
            className="w-32 bg-background border border-input rounded-md px-3 py-2 text-sm"
          >
            {GRID_COLUMN_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>{t(opt.label)}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="cardSize">{t('customization.layout.cardSize')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.layout.cardSizeDesc')}
            </p>
          </div>
          <select
            id="cardSize"
            value={global.cardSize}
            onChange={(e) => updateGlobal({ cardSize: e.target.value as 'compact' | 'default' | 'large' })}
            className="w-32 bg-background border border-input rounded-md px-3 py-2 text-sm"
          >
            {CARD_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  )
}
