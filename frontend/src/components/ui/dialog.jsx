import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/button'

/**
 * Shared Dialog/Modal component — menggantikan semua div fixed hardcoded.
 *
 * Props:
 *   open        {boolean}   Tampilkan atau sembunyikan dialog
 *   onClose     {Function}  Callback ketika dialog ditutup
 *   title       {string}    Judul dialog (optional)
 *   children    {ReactNode} Konten dialog
 *   className   {string}    Extra class untuk panel dialog
 *   size        'sm'|'md'|'lg'|'xl'  Default: 'md'
 */
function Dialog({ open, onClose, title, children, className, size = 'md' }) {
  const panelRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    if (!open) return

    function handleKey(event) {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Lock body scroll when dialog open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-3xl',
  }[size] ?? 'max-w-md'

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-ims-navy/50 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        ref={panelRef}
        className={cn(
          'max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl',
          'sm:rounded-2xl',
          sizeClasses,
          className,
        )}
      >
        {title ? (
          <div className="flex items-start justify-between gap-3 border-b border-ims-slate/20 px-4 py-4 sm:px-5">
            <div>
              <h3 className="text-base font-black text-ims-navy">{title}</h3>
            </div>
            <Button
              size="icon"
              type="button"
              variant="ghost"
              className="shrink-0"
              onClick={onClose}
              aria-label="Tutup dialog"
            >
              <X size={16} />
            </Button>
          </div>
        ) : null}
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  )
}

/**
 * DialogFooter — slot untuk tombol aksi di bagian bawah dialog.
 */
function DialogFooter({ children, className }) {
  return (
    <div className={cn('mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}>
      {children}
    </div>
  )
}

export { Dialog, DialogFooter }
