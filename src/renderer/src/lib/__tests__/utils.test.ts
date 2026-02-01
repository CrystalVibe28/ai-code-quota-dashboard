import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  formatResetTime,
  formatPercentage,
  getQuotaColor,
  getProgressColor,
  debounce
} from '../utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
      expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz')
    })

    it('should merge tailwind classes correctly', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4')
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('should handle undefined and null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
    })
  })

  describe('formatResetTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return empty string for undefined input', () => {
      expect(formatResetTime(undefined)).toBe('')
    })

    it('should return "Now" for past time (without t function)', () => {
      const pastTime = new Date('2024-01-14T12:00:00Z').toISOString()
      expect(formatResetTime(pastTime)).toBe('Now')
    })

    it('should return translated "Now" for past time (with t function)', () => {
      const mockT = vi.fn().mockImplementation((key: string) => {
        if (key === 'time.now') return '現在'
        return key
      })
      const pastTime = new Date('2024-01-14T12:00:00Z').toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatResetTime(pastTime, mockT as any)).toBe('現在')
    })

    it('should format minutes only', () => {
      const futureTime = new Date('2024-01-15T12:30:00Z').toISOString()
      expect(formatResetTime(futureTime)).toBe('30m')
    })

    it('should format hours and minutes', () => {
      const futureTime = new Date('2024-01-15T14:30:00Z').toISOString()
      expect(formatResetTime(futureTime)).toBe('2h 30m')
    })

    it('should format days and hours', () => {
      const futureTime = new Date('2024-01-17T14:00:00Z').toISOString()
      expect(formatResetTime(futureTime)).toBe('2d 2h')
    })

    it('should handle numeric timestamp', () => {
      const futureTime = new Date('2024-01-15T13:00:00Z').getTime()
      expect(formatResetTime(futureTime)).toBe('1h 0m')
    })

    it('should use translation function when provided', () => {
      const mockT = vi.fn().mockImplementation((key: string, options?: { count: number }) => {
        if (key === 'time.hours') return `${options?.count} 小時`
        if (key === 'time.minutes') return `${options?.count} 分鐘`
        return key
      })
      const futureTime = new Date('2024-01-15T14:30:00Z').toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatResetTime(futureTime, mockT as any)).toBe('2 小時 30 分鐘')
    })
  })

  describe('formatPercentage', () => {
    it('should convert fraction to percentage', () => {
      expect(formatPercentage(0.5)).toBe(50)
      expect(formatPercentage(0.75)).toBe(75)
      expect(formatPercentage(1)).toBe(100)
      expect(formatPercentage(0)).toBe(0)
    })

    it('should round to nearest integer', () => {
      expect(formatPercentage(0.333)).toBe(33)
      expect(formatPercentage(0.666)).toBe(67)
      expect(formatPercentage(0.999)).toBe(100)
    })
  })

  describe('getQuotaColor', () => {
    it('should return destructive for <= 10%', () => {
      expect(getQuotaColor(0)).toBe('text-destructive')
      expect(getQuotaColor(5)).toBe('text-destructive')
      expect(getQuotaColor(10)).toBe('text-destructive')
    })

    it('should return warning for <= 25%', () => {
      expect(getQuotaColor(11)).toBe('text-warning')
      expect(getQuotaColor(20)).toBe('text-warning')
      expect(getQuotaColor(25)).toBe('text-warning')
    })

    it('should return success for > 25%', () => {
      expect(getQuotaColor(26)).toBe('text-success')
      expect(getQuotaColor(50)).toBe('text-success')
      expect(getQuotaColor(100)).toBe('text-success')
    })
  })

  describe('getProgressColor', () => {
    it('should return bg-destructive for <= 10%', () => {
      expect(getProgressColor(0)).toBe('bg-destructive')
      expect(getProgressColor(5)).toBe('bg-destructive')
      expect(getProgressColor(10)).toBe('bg-destructive')
    })

    it('should return bg-warning for <= 25%', () => {
      expect(getProgressColor(11)).toBe('bg-warning')
      expect(getProgressColor(20)).toBe('bg-warning')
      expect(getProgressColor(25)).toBe('bg-warning')
    })

    it('should return bg-success for > 25%', () => {
      expect(getProgressColor(26)).toBe('bg-success')
      expect(getProgressColor(50)).toBe('bg-success')
      expect(getProgressColor(100)).toBe('bg-success')
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should delay function execution', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn()
      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should only execute once for multiple rapid calls', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn()
      debouncedFn()
      debouncedFn()

      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments to the debounced function', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('arg1', 'arg2')
      vi.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should use the latest arguments when called multiple times', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('first')
      debouncedFn('second')
      debouncedFn('third')

      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledWith('third')
    })

    it('should reset timer on each call', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn()
      vi.advanceTimersByTime(50)
      debouncedFn()
      vi.advanceTimersByTime(50)
      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(50)
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })
})
