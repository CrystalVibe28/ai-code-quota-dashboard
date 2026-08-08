import { create } from 'zustand'
import type { 
  CustomizationState, 
  GlobalConfig, 
  ProviderConfig, 
  CardConfig,
  ProviderId,
  CardId 
} from '@/types/customization'
import { DEFAULT_GLOBAL_CONFIG } from '@/constants/customization'

interface CustomizationActions {
  updateGlobal: (config: Partial<GlobalConfig>) => void
  
  updateProvider: (providerId: ProviderId, config: Partial<ProviderConfig>) => void
  resetProvider: (providerId: ProviderId) => void
  
  updateCard: (cardId: CardId, config: Partial<CardConfig>) => void
  syncAccountCards: (accounts: Array<{
    providerId: ProviderId
    accountId: string
    cardIds: CardId[]
    fallbackVisible: boolean
  }>) => void
  setAccountCardsVisibility: (providerId: ProviderId, accountId: string, cardIds: CardId[], visible: boolean) => void
  setCardVisibility: (
    providerId: ProviderId,
    accountId: string,
    cardIds: CardId[],
    cardId: CardId,
    visible: boolean,
    fallbackVisible: boolean
  ) => void
  resetCard: (cardId: CardId) => void
  removeAccount: (providerId: ProviderId, accountId: string) => void
  
  loadFromStorage: () => Promise<void>
  saveToStorage: () => Promise<void>
  
  resetAll: () => void
}

type CustomizationStore = CustomizationState & CustomizationActions & { isLoaded: boolean }

const initialState: CustomizationState = {
  global: DEFAULT_GLOBAL_CONFIG,
  providers: {
    antigravity: {},
    aiStudio: {},
    githubCopilot: {},
    zaiCoding: {},
    codex: {},
    opencodeGo: {},
    ollamaCloud: {}
  },
  cards: {}
}

export const useCustomizationStore = create<CustomizationStore>((set, get) => ({
  ...initialState,
  isLoaded: false,

  updateGlobal: (config) => {
    set((state) => ({
      global: { ...state.global, ...config }
    }))
    get().saveToStorage()
  },

  updateProvider: (providerId, config) => {
    set((state) => ({
      providers: {
        ...state.providers,
        [providerId]: { ...state.providers[providerId], ...config }
      }
    }))
    get().saveToStorage()
  },

  resetProvider: (providerId) => {
    set((state) => ({
      providers: {
        ...state.providers,
        [providerId]: {}
      }
    }))
    get().saveToStorage()
  },

  updateCard: (cardId, config) => {
    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: { ...state.cards[cardId], ...config }
      }
    }))
    get().saveToStorage()
  },

  resetCard: (cardId) => {
    set((state) => {
      const { [cardId]: _, ...rest } = state.cards
      return { cards: rest }
    })
    get().saveToStorage()
  },

  syncAccountCards: (accounts) => {
    let changed = false
    set((state) => {
      let cards = state.cards
      let providers = state.providers

      for (const { providerId, accountId, cardIds, fallbackVisible } of accounts) {
        const provider = providers[providerId]
        const configuredVisibility = cardIds
          .map(cardId => cards[cardId]?.visible)
          .filter((visible): visible is boolean => visible !== undefined)
        const visible = configuredVisibility.length > 0
          ? configuredVisibility.some(Boolean)
          : provider.accountCardVisibility?.[accountId] ?? fallbackVisible

        for (const cardId of cardIds) {
          if (cards[cardId]?.visible !== undefined) continue
          if (cards === state.cards) cards = { ...cards }
          cards[cardId] = { ...cards[cardId], visible }
          changed = true
        }

        if (provider.accountCardVisibility?.[accountId] !== visible) {
          providers = {
            ...providers,
            [providerId]: {
              ...provider,
              accountCardVisibility: {
                ...provider.accountCardVisibility,
                [accountId]: visible
              }
            }
          }
          changed = true
        }
      }

      return changed ? { cards, providers } : state
    })
    if (changed) get().saveToStorage()
  },

  setAccountCardsVisibility: (providerId, accountId, cardIds, visible) => {
    set((state) => {
      const provider = state.providers[providerId]
      const cards = { ...state.cards }
      cardIds.forEach(cardId => {
        cards[cardId] = { ...cards[cardId], visible }
      })
      return {
        cards,
        providers: {
          ...state.providers,
          [providerId]: {
            ...provider,
            accountCardVisibility: {
              ...provider.accountCardVisibility,
              [accountId]: visible
            }
          }
        }
      }
    })
    get().saveToStorage()
  },

  setCardVisibility: (providerId, accountId, cardIds, cardId, visible, fallbackVisible) => {
    set((state) => {
      const provider = state.providers[providerId]
      const defaultVisible = provider.accountCardVisibility?.[accountId] ?? fallbackVisible
      const cards = { ...state.cards }
      const currentCardIds = [...new Set([...cardIds, cardId])]

      currentCardIds.forEach(currentCardId => {
        if (cards[currentCardId]?.visible === undefined) {
          cards[currentCardId] = { ...cards[currentCardId], visible: defaultVisible }
        }
      })
      cards[cardId] = { ...cards[cardId], visible }

      const accountVisible = currentCardIds.some(currentCardId => cards[currentCardId].visible)
      return {
        cards,
        providers: {
          ...state.providers,
          [providerId]: {
            ...provider,
            accountCardVisibility: {
              ...provider.accountCardVisibility,
              [accountId]: accountVisible
            }
          }
        }
      }
    })
    get().saveToStorage()
  },

  removeAccount: (providerId, accountId) => {
    const prefix = `${providerId}-${accountId}-`
    set((state) => {
      const provider = state.providers[providerId]
      const { [accountId]: _, ...accountCollapsed } = provider.accountCollapsed || {}
      const { [accountId]: __, ...accountCardVisibility } = provider.accountCardVisibility || {}
      return {
        cards: Object.fromEntries(Object.entries(state.cards).filter(([cardId]) => !cardId.startsWith(prefix))),
        providers: {
          ...state.providers,
          [providerId]: {
            ...provider,
            cardOrder: provider.cardOrder?.filter(cardId => !cardId.startsWith(prefix)),
            accountCollapsed,
            accountCardVisibility
          }
        }
      }
    })
    get().saveToStorage()
  },

  loadFromStorage: async () => {
    set({ isLoaded: false })
    try {
      const stored = await window.api.storage.getCustomization()
      if (stored) {
        const typedStored = stored as Partial<CustomizationState>
        const global = { ...DEFAULT_GLOBAL_CONFIG, ...typedStored.global }
        global.providerOrder = [
          ...global.providerOrder,
          ...DEFAULT_GLOBAL_CONFIG.providerOrder.filter(providerId => !global.providerOrder.includes(providerId))
        ]
        set({
          global,
          providers: { 
            antigravity: {}, 
            aiStudio: {},
            githubCopilot: {}, 
            zaiCoding: {},
            codex: {},
            opencodeGo: {},
            ollamaCloud: {},
            ...typedStored.providers 
          },
          cards: typedStored.cards || {}
        })
      }
    } catch (error) {
      console.error('Failed to load customization:', error)
    } finally {
      set({ isLoaded: true })
    }
  },

  saveToStorage: async () => {
    try {
      const { global, providers, cards } = get()
      await window.api.storage.saveCustomization({ global, providers, cards })
    } catch (error) {
      console.error('Failed to save customization:', error)
    }
  },

  resetAll: () => {
    set(initialState)
    get().saveToStorage()
  }
}))
