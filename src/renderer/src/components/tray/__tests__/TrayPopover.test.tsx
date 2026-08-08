import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../../../../../test/test-utils'
import { TrayPopover } from '../TrayPopover'
import type { TrayPopoverViewModel } from '@shared/types'

const viewModel: TrayPopoverViewModel = {
  locked: false,
  language: 'en',
  theme: 'light',
  accentColor: 'blue',
  cache: {
    updatedAt: 1_700_000_000_000,
    providers: {
      antigravity: [{
        accountId: 'anti-1',
        name: 'Antigravity account',
        usage: [{
          modelName: 'Gemini weekly',
          remainingFraction: 0.8,
          resetTime: '2099-01-01T00:00:00.000Z'
        }]
      }],
      githubCopilot: [],
      zaiCoding: [],
      codex: [{
        accountId: 'codex-1',
        name: 'Codex account',
        usage: {
          rate_limit: {
            primary_window: {
              used_percent: 60,
              limit_window_seconds: 604800,
              reset_after_seconds: 100,
              reset_at: 4_070_908_800
            },
            secondary_window: null
          },
          code_review_rate_limit: null
        }
      }],
      opencodeGo: [],
      ollamaCloud: [],
      aiStudio: []
    }
  }
}

describe('TrayPopover', () => {
  const getViewModel = vi.fn()
  const openMain = vi.fn()
  const hide = vi.fn()
  const onDataUpdated = vi.fn<(callback: () => void) => () => void>(() => vi.fn())

  beforeEach(() => {
    getViewModel.mockResolvedValue(viewModel)
    Object.defineProperty(window, 'trayApi', {
      configurable: true,
      value: { getViewModel, openMain, hide, onDataUpdated }
    })
  })

  it('switches cached providers on hover without exposing a refresh action', async () => {
    render(<TrayPopover />)

    expect(await screen.findByText('Gemini weekly quota')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument()

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Codex' }))

    expect(await screen.findByText('Weekly quota')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('opens the full dashboard only when requested and hides on Escape', async () => {
    render(<TrayPopover />)
    await screen.findByText('Gemini weekly quota')

    fireEvent.click(screen.getByRole('button', { name: 'Open dashboard' }))
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(openMain).toHaveBeenCalledTimes(1)
    expect(hide).toHaveBeenCalledTimes(1)
  })

  it('reloads the local view model when the main process reports a cache update', async () => {
    let update: (() => void) | undefined
    onDataUpdated.mockImplementation(callback => {
      update = callback
      return vi.fn()
    })
    render(<TrayPopover />)
    await screen.findByText('Gemini weekly quota')

    update?.()

    await waitFor(() => expect(getViewModel).toHaveBeenCalledTimes(2))
  })
})
