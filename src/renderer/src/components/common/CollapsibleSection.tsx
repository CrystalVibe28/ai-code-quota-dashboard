import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  icon?: ReactNode
  isCollapsed: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  icon,
  isCollapsed,
  onToggle,
  children,
  className
}: CollapsibleSectionProps) {
  return (
    <section className={cn('min-w-0 rounded-lg', className)}>
      <button
        type="button"
        onClick={onToggle}
        className="mb-3 flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md text-left text-base font-semibold leading-[22px] transition-colors duration-150 hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
        {icon}
        <span className="min-w-0 truncate">{title}</span>
      </button>
      <div className={cn(
        'grid min-w-0 transition-all duration-200',
        isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
      )} aria-hidden={isCollapsed} inert={isCollapsed ? true : undefined}>
        <div className="min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </section>
  )
}
