import { useState } from 'react'
import { Camera, Minus, Package, Plus, QrCode, Search } from 'lucide-react'
import { movementsApi } from '@/api/movements'
import { productsApi } from '@/api/products'
import { MetricCard, OperationsChartGrid } from '@/components/analytics/OperationalCharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useScanner } from '@/hooks/useScanner'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('en-US')
}

function ScannerView() {
  const { t } = useLanguage()
  const [manualBarcode, setManualBarcode] = useState('')
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [unitCost, setUnitCost] = useState(10000)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const selectedInventory = product?.inventories?.[0]
  const currentStock = Number(selectedInventory?.quantity ?? 0)
  const actionQty = Number(quantity || 0)
  const projectedIn = product ? currentStock + actionQty : 0
  const projectedOut = product ? Math.max(0, currentStock - actionQty) : 0
  const inventoryCount = product?.inventories?.length ?? 0
  const scanner = useScanner({
    onResult: lookupProduct,
  })

  async function lookupProduct(barcode) {
    if (!barcode) return

    setError('')
    setMessage('')

    try {
      const response = await productsApi.show(barcode)
      setProduct(response.data.data)
    } catch (error) {
      setProduct(null)
      setError(apiErrorMessage(error, 'Produk tidak ditemukan dari barcode tersebut.'))
    }
  }

  async function handleMovement(type) {
    if (!product) {
      setError('Scan produk terlebih dahulu.')
      return
    }

    const warehouseId = selectedInventory?.warehouse_id

    if (!warehouseId) {
      setError('Produk belum punya stok/gudang default untuk transaksi cepat.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        product_id: product.id,
        warehouse_id: warehouseId,
        quantity: Number(quantity),
        reference_no: `UI-${Date.now()}`,
      }

      if (type === 'IN') {
        await movementsApi.stockIn({
          ...payload,
          unit_cost: Number(unitCost),
          location_bin: selectedInventory.location_bin,
        })
      } else {
        await movementsApi.stockOut(payload)
      }

      setMessage(type === 'IN' ? 'Barang masuk berhasil dicatat.' : 'Barang keluar berhasil dicatat.')
      await lookupProduct(product.barcode)
      setQuantity(1)
    } catch (error) {
      setError(apiErrorMessage(error, 'Transaksi stok gagal.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header removed since handled by TopHeader */}

      {error ? (
        <div className="rounded-[10px] border border-ims-danger/20 bg-ims-danger/10 p-3 text-sm text-ims-danger">
          {error}
        </div>
      ) : null}
      
      {message ? (
        <div className="rounded-[10px] border border-ims-success/20 bg-ims-success/5 p-3 text-sm text-ims-success">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={QrCode} label={t.scanner} value={scanner.isScanning ? t.active : '-'} helper={t.scannerView} tone="blue" />
        <MetricCard icon={Package} label={t.currentStock} value={formatNumber(currentStock)} helper={product?.sku ?? t.productDetail} tone="navy" />
        <MetricCard icon={Plus} label={t.stockIn} value={formatNumber(projectedIn)} helper={`${t.qty}: ${formatNumber(actionQty)}`} tone="success" />
        <MetricCard icon={Minus} label={t.stockOut} value={formatNumber(projectedOut)} helper={`${inventoryCount} ${t.warehouse}`} tone="warning" />
      </section>

      <OperationsChartGrid
        bar={{
          title: t.quickAction,
          subtitle: product?.name ?? t.scanBarcodeProductDetail,
          labels: [t.currentStock, t.stockIn, t.stockOut],
          emptyText: t.scanBarcodeProductDetail,
          series: [{ label: t.unitsCount, values: [currentStock, projectedIn, projectedOut], className: 'bg-ims-blue' }],
        }}
        donut={{
          title: `${t.scanner} Mix`,
          subtitle: t.productDetail,
          centerLabel: t.unitsCount,
          centerValue: formatNumber(currentStock + actionQty),
          emptyText: t.scanBarcodeProductDetail,
          items: [
            { label: t.currentStock, value: product ? currentStock : 0, color: '#4B5694', displayValue: formatNumber(currentStock) },
            { label: t.quantity, value: product ? actionQty : 0, color: '#047857', displayValue: formatNumber(actionQty) },
          ],
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: Camera view */}
        <section className="flex flex-col overflow-hidden rounded-3xl border border-ims-slate/20 bg-white lg:min-h-[500px]">
          <div className="flex items-center justify-between border-b border-ims-slate/20 p-4">
            <h3 className="text-sm font-bold text-ims-navy">{t.scannerView}</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={scanner.start} disabled={scanner.isScanning}>
                <Camera size={15} /> {t.start}
              </Button>
              <Button size="sm" variant="outline" onClick={scanner.stop} disabled={!scanner.isScanning}>
                <QrCode size={15} /> {t.stop}
              </Button>
            </div>
          </div>
          <div className="relative flex-1 bg-ims-cream/25">
            <video id="scanner-video" className="h-full min-h-[400px] w-full object-cover lg:min-h-[500px]" muted playsInline />
            {!scanner.isScanning && (
              <div className="absolute inset-0 grid place-items-center bg-black/5 backdrop-blur-[2px]">
                <div className="text-center text-ims-slate">
                  <Camera className="mx-auto mb-2 opacity-50" size={48} />
                  <p className="text-sm font-semibold">{t.cameraStopped}</p>
                  <p className="mt-1 text-xs">{t.clickStartScan}</p>
                </div>
              </div>
            )}
            {/* Manual Barcode Fallback */}
            <div className="absolute bottom-4 left-1/2 flex w-[calc(100%-2rem)] -translate-x-1/2 gap-2 lg:w-[400px]">
              <Input 
                className="bg-white/90 font-mono shadow-lg backdrop-blur" 
                value={manualBarcode} 
                onChange={(event) => setManualBarcode(event.target.value)} 
                placeholder={t.manualBarcode}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') scanner.submitManualResult(manualBarcode)
                }}
              />
              <Button type="button" onClick={() => scanner.submitManualResult(manualBarcode)} className="shadow-lg">
                <Search size={16} />
              </Button>
            </div>
          </div>
        </section>

        {/* Right: Info & Action */}
        <section className="flex flex-col gap-6">
          {/* Top: Product Info */}
          <div className="rounded-3xl border border-ims-slate/20 bg-white">
            <div className="border-b border-ims-slate/20 p-4">
              <h3 className="text-sm font-bold text-ims-navy">{t.productDetail}</h3>
            </div>
            <div className="p-6">
              {product ? (
                <div className="flex items-start gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-ims-slate/20 bg-ims-cream/25">
                    <Package size={28} className="text-ims-slate" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] font-bold text-ims-slate">SKU: {product.sku}</p>
                    <h2 className="mt-1 text-lg font-black leading-tight text-ims-navy">{product.name}</h2>
                    <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-ims-slate">{t.currentStock}</p>
                        <p className="mt-1 font-mono text-sm font-black text-ims-navy">
                          {formatNumber(selectedInventory?.quantity)} {t.unitsCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-ims-slate">{t.location}</p>
                        <p className="mt-1 text-sm font-bold text-ims-navy">{selectedInventory?.location_bin ?? '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-ims-slate">
                  <QrCode className="mx-auto mb-3 opacity-20" size={48} />
                  <p className="text-sm">{t.scanBarcodeProductDetail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Transaction Form */}
          <div className="flex-1 rounded-3xl border border-ims-slate/20 bg-white">
             <div className="border-b border-ims-slate/20 p-4">
              <h3 className="text-sm font-bold text-ims-navy">{t.quickAction}</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ims-slate">{t.quantity}</label>
                    <Input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ims-slate">{t.unitCost} ({t.stockIn})</label>
                    <Input type="number" min="0" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} />
                  </div>
                </div>
                
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <Button 
                    className="h-11" 
                    isLoading={isSubmitting}
                    disabled={!product} 
                    onClick={() => handleMovement('IN')}
                  >
                    <Plus size={16} className="mr-2" /> {t.stockIn}
                  </Button>
                  <Button 
                    className="h-11 border-ims-danger/20 text-ims-danger hover:bg-ims-danger/10 hover:text-ims-danger" 
                    variant="outline"
                    isLoading={isSubmitting}
                    disabled={!product} 
                    onClick={() => handleMovement('OUT')}
                  >
                    <Minus size={16} className="mr-2" /> {t.stockOut}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ScannerView
