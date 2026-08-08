import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  ProviderId,
  QuotaHistoryPeriod,
  QuotaHistoryPoint
} from '@shared/types'

interface Props {
  providerId: ProviderId
  period: QuotaHistoryPeriod
  points: QuotaHistoryPoint[]
}

const WIDTH = 720
const HEIGHT = 240
const PADDING = { top: 16, right: 20, bottom: 30, left: 42 }
const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))'
]
const DASHES = [undefined, '8 4', '2 4', '10 3 2 3']

export function QuotaHistoryChart({ providerId, period, points }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const title = t(`history.${period}Title`)
  const series = useMemo(() => {
    const grouped = new Map<string, QuotaHistoryPoint[]>()
    for (const point of points) {
      grouped.set(point.seriesKey, [...(grouped.get(point.seriesKey) ?? []), point])
    }
    return Array.from(grouped, ([key, values]) => ({
      key,
      label: getSeriesLabel(providerId, period, key, t),
      points: values.sort((a, b) => a.sampledAt - b.sampledAt)
    }))
  }, [period, points, providerId, t])

  if (points.length === 0) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{t('history.description')}</CardDescription>
        </CardHeader>
        <CardContent className="grid min-h-40 place-items-center text-sm text-muted-foreground">
          {t('history.empty')}
        </CardContent>
      </Card>
    )
  }

  const end = Math.max(Date.now(), ...points.map(point => point.sampledAt))
  const start = end - (period === 'weekly' ? 8 : 32) * 24 * 60 * 60 * 1000
  const plotWidth = WIDTH - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const x = (timestamp: number) => PADDING.left + ((timestamp - start) / (end - start)) * plotWidth
  const y = (remaining: number) => PADDING.top + ((100 - remaining) / 100) * plotHeight
  const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle id={titleId}>{title}</CardTitle>
        <CardDescription>{t('history.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {series.map((item, index) => (
            <span key={item.key} className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-0 w-5 border-t-2"
                style={{
                  borderTopColor: COLORS[index % COLORS.length],
                  borderTopStyle: index === 0 ? 'solid' : index === 2 ? 'dotted' : 'dashed'
                }}
              />
              {item.label}
            </span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-labelledby={titleId}
        >
          <title>{t('history.chartLabel', { title })}</title>
          {[0, 25, 50, 75, 100].map(value => (
            <g key={value}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y(value)}
                y2={y(value)}
                stroke="hsl(var(--border))"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PADDING.left - 8}
                y={y(value) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {value}%
              </text>
            </g>
          ))}
          <text
            x={PADDING.left}
            y={HEIGHT - 5}
            className="fill-muted-foreground text-[11px]"
          >
            {dateFormatter.format(start)}
          </text>
          <text
            x={WIDTH - PADDING.right}
            y={HEIGHT - 5}
            textAnchor="end"
            className="fill-muted-foreground text-[11px]"
          >
            {dateFormatter.format(end)}
          </text>
          {series.map((item, index) => {
            const color = COLORS[index % COLORS.length]
            const path = item.points
              .map((point, pointIndex) => (
                `${pointIndex === 0 ? 'M' : 'L'} ${x(point.sampledAt)} ${y(point.remaining)}`
              ))
              .join(' ')

            return (
              <g key={item.key}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeDasharray={DASHES[index % DASHES.length]}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {item.points.map(point => (
                  <circle
                    key={point.sampledAt}
                    cx={x(point.sampledAt)}
                    cy={y(point.remaining)}
                    r="3"
                    fill="hsl(var(--card))"
                    stroke={color}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>
                      {t('history.pointLabel', {
                        series: item.label,
                        value: point.remaining,
                        time: new Date(point.sampledAt).toLocaleString()
                      })}
                    </title>
                  </circle>
                ))}
              </g>
            )
          })}
        </svg>
      </CardContent>
    </Card>
  )
}

function getSeriesLabel(
  providerId: ProviderId,
  period: QuotaHistoryPeriod,
  seriesKey: string,
  t: (key: string, options?: Record<string, string | number>) => string
): string {
  if (providerId === 'antigravity') return t(`antigravity.quotaTypes.${seriesKey}`)
  if (providerId === 'zaiCoding') return t('zaiCoding.limits.weekly')
  if (providerId === 'opencodeGo') return t(`opencodeGo.quotaTypes.${period}`)
  if (providerId === 'ollamaCloud') return t('ollamaCloud.quotaTypes.weekly')
  if (providerId === 'codex') {
    const suffix = seriesKey.endsWith('primary') ? 'Primary' : 'Secondary'
    return t(`codex.quotaTypes.${seriesKey.startsWith('codeReview') ? 'codeReview' : 'rateLimit'}${suffix}`)
  }
  return seriesKey
}
