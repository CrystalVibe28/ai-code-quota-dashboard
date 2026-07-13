import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold leading-5 transition-[background-color,color,border-color,box-shadow,filter] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-brand text-brand-foreground shadow-fluent-2 hover:brightness-95 active:brightness-90',
        destructive: 'bg-destructive text-destructive-foreground shadow-fluent-2 hover:brightness-95 active:brightness-90',
        outline: 'border border-input bg-card text-foreground shadow-fluent-2 hover:bg-secondary active:bg-muted',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-muted active:brightness-95',
        ghost: 'text-foreground hover:bg-secondary active:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-11 px-4 md:h-8',
        sm: 'h-11 px-3 md:h-8',
        lg: 'h-11 px-5 text-base md:text-sm',
        icon: 'h-11 w-11 px-0 md:h-8 md:w-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
