import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/utils/cn'

function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      className={cn('text-sm font-medium leading-none text-ims-navy', className)}
      {...props}
    />
  )
}

export { Label }
