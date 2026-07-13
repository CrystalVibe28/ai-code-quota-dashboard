import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-md border border-input bg-card px-3 py-1 text-base shadow-fluent-2 transition-[border-color,box-shadow] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:shadow-[inset_0_-2px_0_hsl(var(--primary))] disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 sm:text-sm md:h-8',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
