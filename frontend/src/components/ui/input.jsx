import { cn } from '@/utils/cn'

function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl border border-ims-slate/20 bg-white px-3 py-2 text-sm font-medium text-ims-navy outline-none transition-all placeholder:text-ims-navy/80 hover:border-ims-blue/40 focus:border-ims-blue focus:ring-2 focus:ring-ims-blue/15',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
