import { cva } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ims-blue',
  {
    variants: {
      variant: {
        default: 'bg-ims-blue text-white shadow-sm shadow-ims-blue/10 hover:bg-ims-navy',
        secondary: 'bg-ims-navy text-white shadow-sm shadow-ims-navy/20 hover:bg-ims-blue',
        outline: 'border border-ims-slate/20 bg-white text-ims-navy hover:border-ims-slate/40 hover:bg-ims-cream/25',
        ghost: 'text-ims-navy hover:bg-ims-cream/40',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 px-3',
        lg: 'h-11 px-5',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({ asChild = false, children, className, variant, size, isLoading = false, disabled, ...props }) {
  if (asChild) {
    const child = Array.isArray(children) ? children[0] : children
    const Component = child.type

    return (
      <Component
        {...child.props}
        {...props}
        className={cn(buttonVariants({ variant, size }), child.props.className, className)}
      />
    )
  }

  return (
    <button 
      className={cn(buttonVariants({ variant, size }), className)} 
      disabled={isLoading || disabled} 
      {...props}
    >
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </button>
  )
}

export { Button }
