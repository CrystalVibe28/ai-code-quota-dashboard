import { create } from 'zustand'
import type { AppError, ErrorSeverity } from '@shared/types'
import { ErrorCode, parseError, createAppError, ERROR_I18N_KEYS } from '@shared/types'
import { toast } from '@/hooks/useToast'

interface ErrorState {
  // Current errors list
  errors: AppError[]
  // Last error for quick access
  lastError: AppError | null
  
  // Actions
  addError: (error: AppError | unknown) => void
  removeError: (timestamp: number) => void
  clearErrors: () => void
  clearErrorsByCode: (code: ErrorCode) => void
  
  // Helper methods
  showError: (
    code: ErrorCode, 
    message?: string, 
    options?: { showToast?: boolean; details?: string }
  ) => void
  showErrorFromException: (error: unknown, options?: { showToast?: boolean }) => void
}

const MAX_ERRORS = 50

export const useErrorStore = create<ErrorState>((set, get) => ({
  errors: [],
  lastError: null,
  
  addError: (error: AppError | unknown) => {
    const appError = parseError(error)
    
    set((state) => ({
      errors: [appError, ...state.errors].slice(0, MAX_ERRORS),
      lastError: appError
    }))
    
    return appError
  },
  
  removeError: (timestamp: number) => {
    set((state) => ({
      errors: state.errors.filter(e => e.timestamp !== timestamp),
      lastError: state.lastError?.timestamp === timestamp ? null : state.lastError
    }))
  },
  
  clearErrors: () => {
    set({ errors: [], lastError: null })
  },
  
  clearErrorsByCode: (code: ErrorCode) => {
    set((state) => {
      const filtered = state.errors.filter(e => e.code !== code)
      return {
        errors: filtered,
        lastError: state.lastError?.code === code ? null : state.lastError
      }
    })
  },
  
  showError: (code, message, options = {}) => {
    const { showToast = true, details } = options
    const appError = createAppError(code, message, { details })
    
    get().addError(appError)
    
    if (showToast) {
      showToastForError(appError)
    }
  },
  
  showErrorFromException: (error, options = {}) => {
    const { showToast = true } = options
    const appError = parseError(error)
    
    get().addError(appError)
    
    if (showToast) {
      showToastForError(appError)
    }
  }
}))

/**
 * Show a toast notification for an error
 */
function showToastForError(error: AppError): void {
  const variant = severityToToastVariant(error.severity)
  const title = getErrorTitle(error.severity)
  
  toast({
    variant,
    title,
    description: error.message
  })
}

/**
 * Map error severity to toast variant
 */
function severityToToastVariant(severity: ErrorSeverity): 'default' | 'destructive' | 'warning' | 'info' {
  switch (severity) {
    case 'info':
      return 'info'
    case 'warning':
      return 'warning'
    case 'error':
    case 'critical':
      return 'destructive'
    default:
      return 'default'
  }
}

/**
 * Get error title based on severity
 */
function getErrorTitle(severity: ErrorSeverity): string {
  switch (severity) {
    case 'info':
      return 'Info'
    case 'warning':
      return 'Warning'
    case 'error':
      return 'Error'
    case 'critical':
      return 'Critical Error'
    default:
      return 'Error'
  }
}

// Selector hooks for common use cases
export const useLastError = () => useErrorStore((state) => state.lastError)
export const useErrors = () => useErrorStore((state) => state.errors)
export const useHasErrors = () => useErrorStore((state) => state.errors.length > 0)
