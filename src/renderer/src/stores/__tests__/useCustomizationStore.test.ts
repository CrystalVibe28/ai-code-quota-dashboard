import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockWindowApi } from '../../../../test/mocks/window-api'
import { useCustomizationStore } from '../useCustomizationStore'
import type { GlobalConfig, ProviderConfig, CardConfig } from '@/types/customization'

describe('useCustomizationStore', () => {
  const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
    showOnlyLowQuota: false,
    hideUnlimitedQuota: true,
    gridColumns: 'auto',
    cardSize: 'default',
    providerOrder: ['antigravity', 'githubCopilot', 'zaiCoding'],
    theme: 'system',
    accentColor: 'blue',
    progressStyle: 'solid',
    cardRadius: 'md',
    valueFormat: 'percent',
    decimalPlaces: 0,
    timeFormat: 'relative',
    showResetTime: true,
    autoRefresh: 60,
    cardClickAction: 'none',
    lowQuotaThreshold: 20,
    lowQuotaNotification: true,
    keyboardShortcuts: true
  }

  beforeEach(() => {
    useCustomizationStore.setState({
      global: DEFAULT_GLOBAL_CONFIG,
      providers: {
        antigravity: {},
        githubCopilot: {},
        zaiCoding: {}
      },
      cards: {}
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial global config', () => {
      const state = useCustomizationStore.getState()
      expect(state.global).toEqual(DEFAULT_GLOBAL_CONFIG)
    })

    it('should have empty provider configs', () => {
      const state = useCustomizationStore.getState()
      expect(state.providers).toEqual({
        antigravity: {},
        githubCopilot: {},
        zaiCoding: {}
      })
    })

    it('should have empty cards config', () => {
      const state = useCustomizationStore.getState()
      expect(state.cards).toEqual({})
    })
  })

  describe('updateGlobal', () => {
    it('should update global config partially', () => {
      useCustomizationStore.getState().updateGlobal({ cardSize: 'large' })

      const state = useCustomizationStore.getState()
      expect(state.global.cardSize).toBe('large')
      expect(state.global.theme).toBe('system') // unchanged
    })

    it('should save to storage after update', () => {
      useCustomizationStore.getState().updateGlobal({ theme: 'dark' })

      expect(mockWindowApi.storage.saveCustomization).toHaveBeenCalled()
    })

    it('should merge multiple updates', () => {
      useCustomizationStore.getState().updateGlobal({ cardSize: 'compact' })
      useCustomizationStore.getState().updateGlobal({ gridColumns: 3 })
      useCustomizationStore.getState().updateGlobal({ accentColor: 'green' })

      const state = useCustomizationStore.getState()
      expect(state.global.cardSize).toBe('compact')
      expect(state.global.gridColumns).toBe(3)
      expect(state.global.accentColor).toBe('green')
    })
  })

  describe('updateProvider', () => {
    it('should update provider config', () => {
      useCustomizationStore.getState().updateProvider('antigravity', { 
        collapsed: true 
      })

      const state = useCustomizationStore.getState()
      expect(state.providers.antigravity).toEqual({ collapsed: true })
    })

    it('should not affect other providers', () => {
      useCustomizationStore.getState().updateProvider('githubCopilot', { 
        gridColumns: 2
      })

      const state = useCustomizationStore.getState()
      expect(state.providers.antigravity).toEqual({})
      expect(state.providers.githubCopilot).toEqual({ gridColumns: 2 })
      expect(state.providers.zaiCoding).toEqual({})
    })

    it('should save to storage after update', () => {
      useCustomizationStore.getState().updateProvider('zaiCoding', { collapsed: true })

      expect(mockWindowApi.storage.saveCustomization).toHaveBeenCalled()
    })

    it('should support all ProviderConfig properties', () => {
      const providerConfig: ProviderConfig = {
        collapsed: true,
        accountCollapsed: { 'acc1': true },
        gridColumns: 3,
        cardSize: 'large',
        cardOrder: ['card1', 'card2'],
        cardSortBy: 'quota-desc',
        progressStyle: 'gradient',
        lowQuotaNotification: false
      }
      
      useCustomizationStore.getState().updateProvider('antigravity', providerConfig)

      expect(useCustomizationStore.getState().providers.antigravity).toEqual(providerConfig)
    })
  })

  describe('resetProvider', () => {
    it('should reset provider config to empty', () => {
      // First set some config
      useCustomizationStore.getState().updateProvider('antigravity', { 
        collapsed: true,
        gridColumns: 4
      })
      
      // Then reset
      useCustomizationStore.getState().resetProvider('antigravity')

      expect(useCustomizationStore.getState().providers.antigravity).toEqual({})
    })

    it('should save to storage after reset', () => {
      vi.clearAllMocks()
      useCustomizationStore.getState().resetProvider('githubCopilot')

      expect(mockWindowApi.storage.saveCustomization).toHaveBeenCalled()
    })
  })

  describe('updateCard', () => {
    it('should update card config', () => {
      const cardId = 'antigravity-account1-model1'
      const cardConfig: CardConfig = {
        visible: false,
        valueFormat: 'absolute'
      }
      useCustomizationStore.getState().updateCard(cardId, cardConfig)

      const state = useCustomizationStore.getState()
      expect(state.cards[cardId]).toEqual(cardConfig)
    })

    it('should merge updates for same card', () => {
      const cardId = 'test-card'
      useCustomizationStore.getState().updateCard(cardId, { visible: false })
      useCustomizationStore.getState().updateCard(cardId, { showResetTime: false })

      const state = useCustomizationStore.getState()
      expect(state.cards[cardId]).toEqual({ 
        visible: false,
        showResetTime: false
      })
    })

    it('should save to storage after update', () => {
      useCustomizationStore.getState().updateCard('card1', { valueFormat: 'both' })

      expect(mockWindowApi.storage.saveCustomization).toHaveBeenCalled()
    })
  })

  describe('resetCard', () => {
    it('should remove card config', () => {
      const cardId = 'test-card'
      useCustomizationStore.getState().updateCard(cardId, { visible: false })
      
      useCustomizationStore.getState().resetCard(cardId)

      expect(useCustomizationStore.getState().cards[cardId]).toBeUndefined()
    })

    it('should not affect other cards', () => {
      useCustomizationStore.getState().updateCard('card1', { visible: false })
      useCustomizationStore.getState().updateCard('card2', { valueFormat: 'percent' })
      
      useCustomizationStore.getState().resetCard('card1')

      const state = useCustomizationStore.getState()
      expect(state.cards['card1']).toBeUndefined()
      expect(state.cards['card2']).toEqual({ valueFormat: 'percent' })
    })
  })

  describe('loadFromStorage', () => {
    it('should load customization from storage', async () => {
      const storedData = {
        global: { ...DEFAULT_GLOBAL_CONFIG, theme: 'dark' as const, cardSize: 'large' as const },
        providers: { 
          antigravity: { collapsed: true },
          githubCopilot: {},
          zaiCoding: {}
        },
        cards: { 'card1': { visible: false } }
      }
      mockWindowApi.storage.getCustomization.mockResolvedValue(storedData)

      await useCustomizationStore.getState().loadFromStorage()

      const state = useCustomizationStore.getState()
      expect(state.global.theme).toBe('dark')
      expect(state.global.cardSize).toBe('large')
      expect(state.providers.antigravity).toEqual({ collapsed: true })
      expect(state.cards['card1']).toEqual({ visible: false })
    })

    it('should merge with defaults when loading partial data', async () => {
      const partialData = {
        global: { theme: 'light' as const },
        providers: { antigravity: { collapsed: true } }
      }
      mockWindowApi.storage.getCustomization.mockResolvedValue(partialData)

      await useCustomizationStore.getState().loadFromStorage()

      const state = useCustomizationStore.getState()
      // Should have default values for non-stored properties
      expect(state.global.cardSize).toBe('default')
      expect(state.global.theme).toBe('light')
    })

    it('should handle null storage gracefully', async () => {
      mockWindowApi.storage.getCustomization.mockResolvedValue(null)

      await useCustomizationStore.getState().loadFromStorage()

      // State should remain unchanged
      expect(useCustomizationStore.getState().global).toEqual(DEFAULT_GLOBAL_CONFIG)
    })

    it('should handle storage error gracefully', async () => {
      mockWindowApi.storage.getCustomization.mockRejectedValue(new Error('Storage error'))

      // Should not throw
      await expect(useCustomizationStore.getState().loadFromStorage()).resolves.toBeUndefined()
    })
  })

  describe('saveToStorage', () => {
    it('should save current state to storage', async () => {
      useCustomizationStore.getState().updateGlobal({ theme: 'dark' })
      vi.clearAllMocks()

      await useCustomizationStore.getState().saveToStorage()

      expect(mockWindowApi.storage.saveCustomization).toHaveBeenCalledWith({
        global: expect.objectContaining({ theme: 'dark' }),
        providers: expect.any(Object),
        cards: expect.any(Object)
      })
    })
  })

  describe('resetAll', () => {
    it('should reset all customization to initial state', () => {
      // Make some changes
      useCustomizationStore.getState().updateGlobal({ theme: 'dark', cardSize: 'large' })
      useCustomizationStore.getState().updateProvider('antigravity', { collapsed: true })
      useCustomizationStore.getState().updateCard('card1', { visible: false })

      // Reset
      useCustomizationStore.getState().resetAll()

      const state = useCustomizationStore.getState()
      expect(state.global).toEqual(DEFAULT_GLOBAL_CONFIG)
      expect(state.providers).toEqual({
        antigravity: {},
        githubCopilot: {},
        zaiCoding: {}
      })
      expect(state.cards).toEqual({})
    })

    it('should save to storage after reset', () => {
      vi.clearAllMocks()
      useCustomizationStore.getState().resetAll()

      expect(mockWindowApi.storage.saveCustomization).toHaveBeenCalled()
    })
  })
})
