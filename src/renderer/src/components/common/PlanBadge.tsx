import { cn } from '@/lib/utils'

interface Props {
  plan: string
  className?: string
}

export function PlanBadge({ plan, className }: Props) {
  return (
    <span className={cn('whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary', className)}>
      {plan}
    </span>
  )
}
