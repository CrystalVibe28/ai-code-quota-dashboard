import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from 'i18next'
import { fireEvent, render, screen } from '../../../../../test/test-utils'
import { LayoutSettings } from '../LayoutSettings'
import { DEFAULT_GLOBAL_CONFIG, getQuotaGridClassName } from '@/constants/customization'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { mockWindowApi } from '../../../../../test/mocks/window-api'

describe('LayoutSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.addResourceBundle('en', 'translation', {
      customization: {
        layout: {
          moveUp: 'Move {{provider}} up',
          moveDown: 'Move {{provider}} down'
        }
      },
      nav: {
        antigravity: 'Antigravity',
        githubCopilot: 'GitHub Copilot',
        zaiCoding: 'Zai Coding Plan',
        codex: 'Codex',
        opencodeGo: 'Opencode Go'
      }
    }, true, true)
    useCustomizationStore.setState({ global: DEFAULT_GLOBAL_CONFIG })
    mockWindowApi.storage.saveCustomization.mockResolvedValue(true)
  })

  it('should apply explicit and automatic responsive grid layouts', () => {
    expect(getQuotaGridClassName(4, 'default')).toContain('lg:grid-cols-4')
    expect(getQuotaGridClassName('auto', 'compact')).toContain('lg:grid-cols-4')
    expect(getQuotaGridClassName('auto', 'large')).toContain('lg:grid-cols-2')
  })

  it('should reorder provider sections and persist the layout', () => {
    render(<LayoutSettings />)

    fireEvent.click(screen.getByRole('button', { name: 'Move Antigravity down' }))

    expect(useCustomizationStore.getState().global.providerOrder.slice(0, 2)).toEqual([
      'githubCopilot',
      'antigravity'
    ])
    expect(mockWindowApi.storage.saveCustomization).toHaveBeenCalled()
  })
})
