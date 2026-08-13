import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '../../../../../test/test-utils'
import { QuotaHistoryChart } from '../QuotaHistoryChart'

describe('QuotaHistoryChart', () => {
  const now = Date.UTC(2026, 7, 10, 4)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets users isolate coincident series without changing their visual identity', () => {
    const points = [
      { seriesKey: 'geminiWeekly', sampledAt: now - 3600000, remaining: 80 },
      { seriesKey: 'geminiWeekly', sampledAt: now, remaining: 70 },
      { seriesKey: 'claudeGptWeekly', sampledAt: now - 3600000, remaining: 80 },
      { seriesKey: 'claudeGptWeekly', sampledAt: now, remaining: 70 }
    ]
    const { container } = render(
      <QuotaHistoryChart providerId="antigravity" period="weekly" points={points} />
    )

    expect(container.querySelectorAll('path[data-series-key]')).toHaveLength(2)
    expect(container.querySelectorAll('circle[data-series-endpoint]')).toHaveLength(0)

    const claudeButton = screen.getByRole('button', { name: /Claude\/GPT weekly quota/ })
    fireEvent.click(claudeButton)

    expect(claudeButton).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelectorAll('path[data-series-key]')).toHaveLength(1)
    const path = container.querySelector('path[data-series-key="claudeGptWeekly"]')
    expect(path).toHaveAttribute('stroke', 'hsl(var(--success))')
    expect(path).toHaveAttribute('stroke-dasharray', '8 4')
    expect(container.querySelectorAll('circle[data-series-endpoint]')).toHaveLength(1)

    fireEvent.click(claudeButton)
    expect(container.querySelectorAll('path[data-series-key]')).toHaveLength(2)
  })

  it('keeps dense samples in the path without rendering dense markers', () => {
    const points = Array.from({ length: 100 }, (_, index) => ({
      seriesKey: 'rateLimit:primary',
      sampledAt: now - (99 - index) * 3600000,
      remaining: 100 - index / 2
    }))
    const { container } = render(
      <QuotaHistoryChart providerId="codex" period="weekly" points={points} />
    )

    const path = container.querySelector('path[data-series-key="rateLimit:primary"]')
    expect(path?.getAttribute('d')?.match(/[ML]/g)).toHaveLength(100)
    expect(container.querySelectorAll('circle[data-series-endpoint]')).toHaveLength(1)
  })

  it('breaks the line across a long collection gap', () => {
    const { container } = render(
      <QuotaHistoryChart
        providerId="codex"
        period="weekly"
        points={[
          { seriesKey: 'rateLimit:primary', sampledAt: now - 8 * 3600000, remaining: 80 },
          { seriesKey: 'rateLimit:primary', sampledAt: now, remaining: 70 }
        ]}
      />
    )

    const path = container.querySelector('path[data-series-key="rateLimit:primary"]')
    expect(path?.getAttribute('d')?.match(/M/g)).toHaveLength(2)
    expect(container.querySelectorAll('circle[data-series-isolated]')).toHaveLength(1)
    expect(container.querySelectorAll('circle[data-series-endpoint]')).toHaveLength(1)
  })

  it('marks audited sync failures without changing quota coordinates', () => {
    const { container } = render(
      <QuotaHistoryChart
        providerId="codex"
        period="weekly"
        points={[{ seriesKey: 'rateLimit:primary', sampledAt: now, remaining: 70 }]}
        auditPoints={[{
          sampledAt: now,
          lastAttemptAt: now + 1000,
          attempts: 2,
          successes: 1,
          failures: 1,
          lastSuccess: true
        }]}
      />
    )

    expect(container.querySelector('[data-sync-failures="1"]')).toBeInTheDocument()
    expect(screen.getByText('Sync-affected hours: 1')).toBeInTheDocument()
  })

  it('shows audited failures even before the first successful quota sample', () => {
    render(
      <QuotaHistoryChart
        providerId="codex"
        period="weekly"
        points={[]}
        auditPoints={[{
          sampledAt: now,
          lastAttemptAt: now,
          attempts: 1,
          successes: 0,
          failures: 1,
          lastSuccess: false
        }]}
      />
    )

    expect(screen.getByText('Recent sync-affected hours: 1; no successful samples yet'))
      .toBeInTheDocument()
  })
})
