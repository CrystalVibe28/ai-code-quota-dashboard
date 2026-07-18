import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { SettingsSelect } from '@/components/settings/SettingsSelect'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { GRID_COLUMN_OPTIONS, CARD_SIZE_OPTIONS, OVERVIEW_LAYOUT_OPTIONS } from '@/constants/customization'
import { getProviderById } from '@/constants/providers'

export function LayoutSettings() {
  const { t } = useTranslation()
  const { global, updateGlobal } = useCustomizationStore()

  const moveProvider = (index: number, offset: -1 | 1) => {
    const targetIndex = index + offset
    if (targetIndex < 0 || targetIndex >= global.providerOrder.length) return

    const providerOrder = [...global.providerOrder]
    const movingProvider = providerOrder[index]
    providerOrder[index] = providerOrder[targetIndex]
    providerOrder[targetIndex] = movingProvider
    updateGlobal({ providerOrder })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" />
          {t('customization.layout.title')}
        </CardTitle>
        <CardDescription>{t('customization.layout.description')}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <div className="fluent-setting-row pb-4">
          <div>
            <Label htmlFor="overviewLayout">{t('customization.layout.overviewLayout')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.layout.overviewLayoutDesc')}
            </p>
          </div>
          <SettingsSelect
            id="overviewLayout"
            value={global.overviewLayout}
            onValueChange={(value) => updateGlobal({ overviewLayout: value as 'compact' | 'cards' })}
            options={OVERVIEW_LAYOUT_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.label)
            }))}
          />
        </div>

        <div className="fluent-setting-row py-4">
          <div>
            <Label htmlFor="gridColumns">{t('customization.layout.gridColumns')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.layout.gridColumnsDesc')}
            </p>
          </div>
          <SettingsSelect
            id="gridColumns"
            value={String(global.gridColumns)}
            onValueChange={(val) => {
              updateGlobal({ gridColumns: val === 'auto' ? 'auto' : Number(val) as 1|2|3|4 })
            }}
            options={GRID_COLUMN_OPTIONS.map((opt) => ({ value: String(opt.value), label: t(opt.label) }))}
          />
        </div>

        <div className="fluent-setting-row py-4">
          <div>
            <Label htmlFor="cardSize">{t('customization.layout.cardSize')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.layout.cardSizeDesc')}
            </p>
          </div>
          <SettingsSelect
            id="cardSize"
            value={global.cardSize}
            onValueChange={(value) => updateGlobal({ cardSize: value as 'compact' | 'default' | 'large' })}
            options={CARD_SIZE_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.label) }))}
          />
        </div>

        <div className="pt-4">
          <div>
            <p id="provider-order-label" className="text-sm font-medium leading-5">
              {t('customization.layout.providerOrder')}
            </p>
            <p className="text-sm leading-5 text-muted-foreground">
              {t('customization.layout.providerOrderDesc')}
            </p>
          </div>

          <ol className="mt-3 space-y-2" aria-labelledby="provider-order-label">
            {global.providerOrder.map((providerId, index) => {
              const provider = getProviderById(providerId)
              if (!provider) return null

              const ProviderIcon = provider.icon
              const providerLabel = t(provider.labelKey)

              return (
                <li key={providerId} className="flex min-h-11 items-center gap-3 rounded-md border bg-secondary/40 px-3 py-1.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-card font-data text-xs text-muted-foreground shadow-fluent-2">
                    {index + 1}
                  </span>
                  <ProviderIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{providerLabel}</span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shadow-none"
                      disabled={index === 0}
                      onClick={() => moveProvider(index, -1)}
                      aria-label={t('customization.layout.moveUp', { provider: providerLabel })}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shadow-none"
                      disabled={index === global.providerOrder.length - 1}
                      onClick={() => moveProvider(index, 1)}
                      aria-label={t('customization.layout.moveDown', { provider: providerLabel })}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
