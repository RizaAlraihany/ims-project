import { cva } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold', {
  variants: {
    variant: {
      default: 'bg-ims-navy text-white',
      warning: 'bg-ims-warning/10 text-ims-warning',
      success: 'bg-ims-success/10 text-ims-success',
      destructive: 'bg-ims-danger/10 text-ims-danger',
      muted: 'bg-ims-cream/40 text-ims-navy',
      outline: 'border border-ims-slate/30 text-ims-slate',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
