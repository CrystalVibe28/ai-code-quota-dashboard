import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  isCollapsed: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  isCollapsed,
  onToggle,
  children,
  className
}: CollapsibleSectionProps) {
  return (
    <section className={className}>
      <button
        onClick={onToggle}
        className="w-full text-left text-lg font-semibold mb-3 flex items-center gap-2 hover:text-primary transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
        {title}
      </button>
      <div className={cn(
        'transition-all duration-200 overflow-hidden',
        isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
      )}>
        {children}
      </div>
    </section>
  )
}
