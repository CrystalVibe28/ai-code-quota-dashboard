import '@testing-library/jest-dom/vitest'
import { vi, afterEach } from 'vitest'
import { mockWindowApi } from './mocks/window-api'

// Mock window.api for renderer tests
Object.defineProperty(window, 'api', {
  value: mockWindowApi,
  writable: true
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})
