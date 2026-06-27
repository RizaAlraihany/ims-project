import { useId, useState } from 'react'
import { Barcode, Camera, Search } from 'lucide-react'
import { productsApi } from '@/api/products'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/hooks/useLanguage'
import { useScanner } from '@/hooks/useScanner'
import { apiErrorMessage } from '@/utils/apiError'

function ScannerActionButton({
  buttonClassName = '',
  buttonLabel,
  className = '',
  disabled = false,
  onProductFound,
  size,
  variant = 'outline',
}) {
  const { t } = useLanguage()
  const rawId = useId().replaceAll(':', '')
  const readerId = `scanner-video-${rawId}`
  const [isOpen, setIsOpen] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function lookupProduct(barcode) {
    if (!barcode) return

    setError('')
    setMessage('')

    try {
      const response = await productsApi.show(barcode)
      const product = response.data?.data
      onProductFound?.(product)
      setMessage(product?.name ? `${product.sku} - ${product.name}` : barcode)
      setManualBarcode('')
    } catch (error) {
      setError(apiErrorMessage(error, 'Produk tidak ditemukan dari barcode tersebut.'))
    }
  }

  const scanner = useScanner({
    readerId,
    onResult: lookupProduct,
  })

  function closeDialog() {
    scanner.stop()
    setIsOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={buttonClassName || className}
        disabled={disabled}
        onClick={() => {
          setError('')
          setMessage('')
          setIsOpen(true)
        }}
      >
        <Barcode size={16} />
        {buttonLabel ?? t.scanBarcode}
      </Button>

      <Dialog open={isOpen} onClose={closeDialog} title={t.scanBarcode} size="lg">
        <div className="space-y-4">
          {error || scanner.error ? (
            <p className="rounded-lg border border-ims-danger/20 bg-ims-danger/10 p-3 text-xs text-ims-danger">
              {error || scanner.error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-lg border border-ims-success/20 bg-ims-success/10 p-3 text-xs font-semibold text-ims-success">
              {message}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-3xl border border-ims-slate/20 bg-ims-cream/35">
            <video id={readerId} className="h-[280px] w-full object-cover" muted playsInline />
          </div>

          <div className="rounded-3xl border border-ims-slate/20 bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-ims-blue/10 text-ims-blue">
                <Barcode size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-ims-navy">{t.manualBarcode}</p>
                <p className="text-xs text-ims-slate">{t.scanBarcode}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                className="font-mono"
                value={manualBarcode}
                placeholder={t.manualBarcode}
                onChange={(event) => setManualBarcode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') lookupProduct(manualBarcode)
                }}
              />
              <Button type="button" onClick={() => lookupProduct(manualBarcode)} aria-label={t.search}>
                <Search size={16} />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeDialog}>{t.done}</Button>
          <Button type="button" onClick={scanner.start} disabled={scanner.isScanning}>
            <Camera size={16} />
            {scanner.isScanning ? t.loading : t.start}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}

export default ScannerActionButton
