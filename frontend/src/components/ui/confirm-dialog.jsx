import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'

/**
 * ConfirmDialog — menggantikan window.confirm() native browser.
 * Sesuai UI_SPEC: semua transaksi inventory wajib ada Confirmation Dialog sebelum submit.
 *
 * Props:
 *   open          {boolean}   Tampilkan dialog
 *   onClose       {Function}  Callback ketika batal / tutup
 *   onConfirm     {Function}  Callback ketika konfirmasi ditekan
 *   title         {string}    Judul konfirmasi
 *   description   {string}    Pesan konfirmasi
 *   confirmLabel  {string}    Label tombol konfirmasi (default: 'Konfirmasi')
 *   cancelLabel   {string}    Label tombol batal (default: 'Batal')
 *   isLoading     {boolean}   State loading saat konfirmasi diproses
 *   variant       'danger'|'default'  Warna tombol konfirmasi
 */
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  isLoading = false,
  variant = 'default',
}) {
  return (
    <Dialog open={open} onClose={onClose} size="sm">
      <div className="flex gap-3">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ims-warning/10 text-ims-warning">
          <AlertTriangle size={18} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-ims-navy">{title}</h3>
          {description ? (
            <p className="mt-1.5 text-sm leading-6 text-ims-slate">{description}</p>
          ) : null}
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={isLoading} onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          disabled={isLoading}
          className={variant === 'danger' ? 'bg-ims-danger text-white hover:bg-ims-danger/90' : undefined}
          onClick={onConfirm}
        >
          {isLoading ? 'Memproses...' : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

export { ConfirmDialog }
