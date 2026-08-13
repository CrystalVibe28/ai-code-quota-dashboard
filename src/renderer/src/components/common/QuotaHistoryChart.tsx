import { useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  ProviderId,
  QuotaHistoryPeriod,
  QuotaHistoryPoint,
  QuotaSyncAuditPoint
} from '@shared/types'

interface Props {
  providerId: ProviderId
  period: QuotaHistoryPeriod
  points: QuotaHistoryPoint[]
  auditPoints?: QuotaSyncAuditPoint[]
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
const HOUR_MS = 60 * 60 * 1000
const MAX_CONNECTED_GAP_MS = 6 * HOUR_MS

export function QuotaHistoryChart({ providerId, period, points, auditPoints = [] }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const descriptionId = useId()
  const [isolatedSeriesKey, setIsolatedSeriesKey] = useState<string | null>(null)
  const title = t(`history.${period}Title`)
  const series = useMemo(() => {
    const grouped = new Map<string, QuotaHistoryPoint[]>()
    for (const point of points) {
      grouped.set(point.seriesKey, [...(grouped.get(point.seriesKey) ?? []), point])
    }
    return Array.from(grouped, ([key, values], index) => ({
      key,
      index,
      label: getSeriesLabel(providerId, period, key, t),
      points: values.sort((a, b) => a.sampledAt - b.sampledAt)
    }))
  }, [period, points, providerId, t])
  const activeIsolatedSeriesKey = series.some(item => item.key === isolatedSeriesKey)
    ? isolatedSeriesKey
    : null
  const visibleSeries = activeIsolatedSeriesKey
    ? series.filter(item => item.key === activeIsolatedSeriesKey)
    : series

  useEffect(() => {
    if (isolatedSeriesKey && !activeIsolatedSeriesKey) setIsolatedSeriesKey(null)
  }, [activeIsolatedSeriesKey, isolatedSeriesKey])

  const end = Math.max(Date.now(), ...points.map(point => point.sampledAt))
  const start = end - (period === 'weekly' ? 8 : 32) * 24 * HOUR_MS
  const failedAuditPoints = auditPoints.filter(point => (
    point.failures > 0 && point.sampledAt >= start && point.sampledAt <= end
  ))

  if (points.length === 0) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{t('history.description')}</CardDescription>
        </CardHeader>
        <CardContent className={`grid min-h-40 place-items-center text-sm ${failedAuditPoints.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {failedAuditPoints.length > 0
            ? t('history.emptyWithSyncFailures', { count: failedAuditPoints.length })
            : t('history.empty')}
        </CardContent>
      </Card>
    )
  }

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
        <div className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {series.map(item => {
            const latest = item.points.at(-1)
            const pressed = activeIsolatedSeriesKey === item.key
            return (
              <Button
                key={item.key}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={pressed}
                aria-label={t('history.seriesSummary', {
                  series: item.label,
                  value: latest?.remaining ?? 0,
                  count: item.points.length
                })}
                className="gap-2 px-2 text-xs font-normal text-muted-foreground shadow-none aria-pressed:bg-accent aria-pressed:text-accent-foreground"
                onClick={() => setIsolatedSeriesKey(pressed ? null : item.key)}
              >
                <span
                  aria-hidden="true"
                  className="h-0 w-5 border-t-2"
                  style={{
                    borderTopColor: COLORS[item.index % COLORS.length],
                    borderTopStyle: item.index === 0 ? 'solid' : item.index === 2 ? 'dotted' : 'dashed'
                  }}
                />
                <span>{item.label}</span>
                <span className="font-medium text-foreground">{latest?.remaining ?? 0}%</span>
                <span aria-hidden="true">· {item.points.length}</span>
              </Button>
            )
          })}
          {failedAuditPoints.length > 0 && (
            <span className="ml-auto inline-flex items-center gap-2 px-2 text-destructive">
              <span aria-hidden="true" className="h-4 border-l border-dashed border-destructive" />
              {t('history.failedSyncHours', { count: failedAuditPoints.length })}
            </span>
          )}
        </div>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <title>{t('history.chartLabel', { title })}</title>
          <desc id={descriptionId}>
            {t('history.chartSummary', { series: series.length, points: points.length })}
          </desc>
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
          {failedAuditPoints.map(point => (
            <line
              key={point.sampledAt}
              data-sync-failures={point.failures}
              x1={x(point.sampledAt)}
              x2={x(point.sampledAt)}
              y1={PADDING.top}
              y2={HEIGHT - PADDING.bottom}
              stroke={point.lastSuccess ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
              strokeDasharray="3 5"
              strokeWidth="1"
              opacity="0.65"
              vectorEffect="non-scaling-stroke"
            >
              <title>
                {t('history.syncFailurePoint', {
                  time: new Date(point.lastAttemptAt).toLocaleString(),
                  failures: point.failures,
                  attempts: point.attempts
                })}
              </title>
            </line>
          ))}
          {visibleSeries.map(item => {
            const color = COLORS[item.index % COLORS.length]
            const path = item.points
              .map((point, pointIndex) => {
                const previous = item.points[pointIndex - 1]
                const startsSegment = !previous
                  || point.sampledAt - previous.sampledAt > MAX_CONNECTED_GAP_MS
                return `${startsSegment ? 'M' : 'L'} ${x(point.sampledAt)} ${y(point.remaining)}`
              })
              .join(' ')
            const latest = item.points.at(-1)
            const showLatestMarker = visibleSeries.length === 1 || item.points.length === 1
            const isolatedPoints = item.points.filter((point, index) => {
              const previous = item.points[index - 1]
              const next = item.points[index + 1]
              const connectsToPrevious = previous
                && point.sampledAt - previous.sampledAt <= MAX_CONNECTED_GAP_MS
              const connectsToNext = next
                && next.sampledAt - point.sampledAt <= MAX_CONNECTED_GAP_MS
              return !connectsToPrevious && !connectsToNext
            })

            return (
              <g key={item.key}>
                <path
                  data-series-key={item.key}
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeDasharray={DASHES[item.index % DASHES.length]}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {item.points.map(point => (
                  <circle
                    key={`hit:${point.sampledAt}`}
                    data-series-hit={item.key}
                    cx={x(point.sampledAt)}
                    cy={y(point.remaining)}
                    r="6"
                    fill="transparent"
                    stroke="none"
                    pointerEvents="all"
                    aria-hidden="true"
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
                {isolatedPoints
                  .filter(point => !showLatestMarker || point !== latest)
                  .map(point => (
                    <circle
                      key={`isolated:${point.sampledAt}`}
                      data-series-isolated={item.key}
                      cx={x(point.sampledAt)}
                      cy={y(point.remaining)}
                      r="3"
                      fill="hsl(var(--card))"
                      stroke={color}
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                      aria-hidden="true"
                    />
                  ))}
                {showLatestMarker && latest && (
                  <circle
                    data-series-endpoint={item.key}
                    cx={x(latest.sampledAt)}
                    cy={y(latest.remaining)}
                    r="4"
                    fill="hsl(var(--card))"
                    stroke={color}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>
                      {t('history.pointLabel', {
                        series: item.label,
                        value: latest.remaining,
                        time: new Date(latest.sampledAt).toLocaleString()
                      })}
                    </title>
                  </circle>
                )}
              </g>
            )
          })}
        </svg>
        <table className="sr-only">
          <caption>{t('history.dataTableCaption', { title })}</caption>
          <thead>
            <tr>
              <th scope="col">{t('history.seriesColumn')}</th>
              <th scope="col">{t('history.timeColumn')}</th>
              <th scope="col">{t('history.remainingColumn')}</th>
            </tr>
          </thead>
          <tbody>
            {series.flatMap(item => item.points.map(point => (
              <tr key={`${item.key}:${point.sampledAt}`}>
                <th scope="row">{item.label}</th>
                <td>{new Date(point.sampledAt).toLocaleString()}</td>
                <td>{point.remaining}%</td>
              </tr>
            )))}
          </tbody>
        </table>
        {failedAuditPoints.length > 0 && (
          <ul className="sr-only" aria-label={t('history.syncAuditLabel')}>
            {failedAuditPoints.map(point => (
              <li key={point.sampledAt}>
                {t('history.syncFailurePoint', {
                  time: new Date(point.lastAttemptAt).toLocaleString(),
                  failures: point.failures,
                  attempts: point.attempts
                })}
              </li>
            ))}
          </ul>
        )}
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
