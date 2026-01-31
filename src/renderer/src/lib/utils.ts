import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { TFunction } from 'i18next'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatResetTime(resetTime: string | number | undefined, t?: TFunction): string {
  if (!resetTime) return ''
  
  const date = typeof resetTime === 'number' 
    ? new Date(resetTime)
    : new Date(resetTime)
  
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  
  if (diff <= 0) return t ? t('time.now') : 'Now'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) {
    return t 
      ? `${t('time.days', { count: days })} ${t('time.hours', { count: hours })}`
      : `${days}d ${hours}h`
  }
  if (hours > 0) {
    return t 
      ? `${t('time.hours', { count: hours })} ${t('time.minutes', { count: minutes })}`
      : `${hours}h ${minutes}m`
  }
  return t ? t('time.minutes', { count: minutes }) : `${minutes}m`
}

export function formatPercentage(fraction: number): number {
  return Math.round(fraction * 100)
}

export function getQuotaColor(percentage: number): string {
  if (percentage <= 10) return 'text-destructive'
  if (percentage <= 25) return 'text-warning'
  return 'text-success'
}

export function getProgressColor(percentage: number): string {
  if (percentage <= 10) return 'bg-destructive'
  if (percentage <= 25) return 'bg-warning'
  return 'bg-success'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}
