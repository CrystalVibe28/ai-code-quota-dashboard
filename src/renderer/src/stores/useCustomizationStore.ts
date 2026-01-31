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
  resetCard: (cardId: CardId) => void
  
  loadFromStorage: () => Promise<void>
  saveToStorage: () => Promise<void>
  
  resetAll: () => void
}

type CustomizationStore = CustomizationState & CustomizationActions

const initialState: CustomizationState = {
  global: DEFAULT_GLOBAL_CONFIG,
  providers: {
    antigravity: {},
    githubCopilot: {},
    zaiCoding: {}
  },
  cards: {}
}

export const useCustomizationStore = create<CustomizationStore>((set, get) => ({
  ...initialState,

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

  loadFromStorage: async () => {
    try {
      const stored = await window.api.storage.getCustomization()
      if (stored) {
        const typedStored = stored as Partial<CustomizationState>
        set({
          global: { ...DEFAULT_GLOBAL_CONFIG, ...typedStored.global },
          providers: { 
            antigravity: {}, 
            githubCopilot: {}, 
            zaiCoding: {},
            ...typedStored.providers 
          },
          cards: typedStored.cards || {}
        })
      }
    } catch (error) {
      console.error('Failed to load customization:', error)
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
