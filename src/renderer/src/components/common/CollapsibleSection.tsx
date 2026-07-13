import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  meta?: string
  isCollapsed: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  meta,
  isCollapsed,
  onToggle,
  children,
  className
}: CollapsibleSectionProps) {
  return (
    <section className={cn('min-w-0 rounded-lg', className)}>
      <button
        onClick={onToggle}
        className="mb-3 flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md text-left text-base font-semibold leading-[22px] transition-colors duration-150 hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
        <span className="min-w-0 truncate">{title}</span>
        {meta && (
          <span className="ml-auto shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-normal leading-4 text-muted-foreground">
            {meta}
          </span>
        )}
      </button>
      <div className={cn(
        'min-w-0 overflow-hidden transition-all duration-200',
        isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
      )}>
        {children}
      </div>
    </section>
  )
}
