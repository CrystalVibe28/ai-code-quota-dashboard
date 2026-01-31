import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import type { 
  ProviderId, 
  CardId, 
  GlobalConfig,
  EffectiveCardConfig,
  ProviderConfig
} from '@/types/customization'

interface CustomizationContextValue {
  global: GlobalConfig
  
  getProviderConfig: (providerId: ProviderId) => GlobalConfig & ProviderConfig
  
  getCardConfig: (providerId: ProviderId, cardId: CardId) => EffectiveCardConfig
  
  isCardVisible: (providerId: ProviderId, cardId: CardId) => boolean
  
  getSortedProviders: () => ProviderId[]
  
  getSortedCards: (providerId: ProviderId, cardIds: CardId[]) => CardId[]
}

const CustomizationContext = createContext<CustomizationContextValue | null>(null)

export function CustomizationProvider({ children }: { children: ReactNode }) {
  const { global, providers, cards, loadFromStorage } = useCustomizationStore()
  
  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  const value = useMemo<CustomizationContextValue>(() => ({
    global,
    
    getProviderConfig: (providerId) => {
      const providerConfig = providers[providerId] || {}
      return { ...global, ...providerConfig }
    },
    
    getCardConfig: (providerId, cardId) => {
      const providerConfig = providers[providerId] || {}
      const cardConfig = cards[cardId] || {}
      
      return {
        visible: cardConfig.visible ?? true,
        gridColumns: providerConfig.gridColumns ?? global.gridColumns,
        cardSize: providerConfig.cardSize ?? global.cardSize,
        progressStyle: providerConfig.progressStyle ?? global.progressStyle,
        valueFormat: cardConfig.valueFormat ?? global.valueFormat,
        showResetTime: cardConfig.showResetTime ?? global.showResetTime,
        cardRadius: global.cardRadius,
        lowQuotaThreshold: global.lowQuotaThreshold
      }
    },
    
    isCardVisible: (_providerId, cardId) => {
      const cardConfig = cards[cardId]
      return cardConfig?.visible ?? true
    },
    
    getSortedProviders: () => {
      return global.providerOrder
    },
    
    getSortedCards: (providerId, cardIds) => {
      const providerConfig = providers[providerId] || {}
      const sortBy = providerConfig.cardSortBy || 'manual'
      
      if (sortBy === 'manual' && providerConfig.cardOrder) {
        const ordered = [...providerConfig.cardOrder]
        cardIds.forEach(id => {
          if (!ordered.includes(id)) ordered.push(id)
        })
        return ordered.filter(id => cardIds.includes(id))
      }
      
      return cardIds
    }
  }), [global, providers, cards])

  return (
    <CustomizationContext.Provider value={value}>
      {children}
    </CustomizationContext.Provider>
  )
}

export function useCustomization() {
  const context = useContext(CustomizationContext)
  if (!context) {
    throw new Error('useCustomization must be used within CustomizationProvider')
  }
  return context
}
