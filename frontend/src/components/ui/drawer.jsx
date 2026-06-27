import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Drawer Component — panel slide-out dari sisi kanan layar.
 * Digunakan untuk form Master Data (pengganti split-screen).
 * Lebar default 480px sesuai requirement.
 */
function Drawer({ open, onOpenChange, title, description, children, className }) {
  const [isRendered, setIsRendered] = useState(open)

  if (open && !isRendered) {
    setIsRendered(true)
  }

  // Handle render state for animation
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    } else {
      document.body.style.overflow = ''
      const timer = setTimeout(() => setIsRendered(false), 300) // Match transition duration
      return () => clearTimeout(timer)
    }
  }, [open])

  // Handle escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onOpenChange])

  if (!isRendered) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-ims-navy/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={cn(
          'relative z-50 flex w-full max-w-[480px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-ims-slate/20 px-6 py-5">
          <div>
            <h2 className="text-xl font-black text-ims-navy">{title}</h2>
            {description && <p className="mt-1 text-sm text-ims-slate">{description}</p>}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-2 text-ims-slate transition-colors hover:bg-ims-cream/40 hover:text-ims-navy focus:outline-none focus:ring-2 focus:ring-ims-blue"
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

function DrawerFooter({ className, children }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 border-t border-ims-slate/20 bg-ims-cream/25 px-6 py-4', className)}>
      {children}
    </div>
  )
}

export { Drawer, DrawerFooter }
