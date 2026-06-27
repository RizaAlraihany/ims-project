import { cn } from '@/utils/cn'

function Card({ className, ...props }) {
  return <div className={cn('rounded-3xl border border-ims-slate/20 bg-white shadow-none', className)} {...props} />
}

function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1.5 border-b border-ims-slate/10 p-5 lg:p-6', className)} {...props} />
}

function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-bold text-ims-navy', className)} {...props} />
}

function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-ims-slate', className)} {...props} />
}

function CardContent({ asChild = false, className, children, ...props }) {
  if (asChild) {
    const child = Array.isArray(children) ? children[0] : children
    const Component = child.type

    return (
      <Component
        {...child.props}
        {...props}
        className={cn('p-5 lg:p-6', child.props.className, className)}
      />
    )
  }

  return <div className={cn('p-5 lg:p-6', className)} {...props}>{children}</div>
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle }
