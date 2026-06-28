import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, PackageCheck } from 'lucide-react'
import { inventoryApi } from '@/api/inventory'
import { warehousesApi } from '@/api/warehouses'
import { MetricCard, OperationsChartGrid } from '@/components/analytics/OperationalCharts'
import ScannerActionButton from '@/components/scanner/ScannerActionButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useLanguage } from '@/hooks/useLanguage'
import { setTransferDraft } from '@/store/transferDraft'
import { apiErrorMessage } from '@/utils/apiError'

function TransferForm() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [warehouses, setWarehouses] = useState([])
  const [inventories, setInventories] = useState([])
  const [form, setForm] = useState({
    source_warehouse_id: '',
    dest_warehouse_id: '',
    product_id: '',
    quantity: 1,
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    async function loadData() {
      setIsLoading(true)
      setError('')

      try {
        const [warehouseResponse, inventoryResponse] = await Promise.all([
          warehousesApi.list({ per_page: 100 }),
          inventoryApi.list({ per_page: 100 }),
        ])

        if (ignore) return

        const nextWarehouses = warehouseResponse.data.data ?? []
        setWarehouses(nextWarehouses)
        setInventories(inventoryResponse.data.data ?? [])
        setForm((current) => ({
          ...current,
          source_warehouse_id: current.source_warehouse_id || String(nextWarehouses[0]?.id ?? ''),
          dest_warehouse_id: current.dest_warehouse_id || String(nextWarehouses[1]?.id ?? nextWarehouses[0]?.id ?? ''),
        }))
      } catch (error) {
        if (!ignore) setError(apiErrorMessage(error, t.transferLoadFailed))
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [t])

  const sourceInventories = useMemo(
    () => inventories.filter((inventory) => String(inventory.warehouse_id) === String(form.source_warehouse_id) && Number(inventory.quantity) > 0),
    [form.source_warehouse_id, inventories],
  )

  const selectedProductId = form.product_id || String(sourceInventories[0]?.product_id ?? '')
  const selectedInventory = sourceInventories.find((inventory) => String(inventory.product_id) === String(selectedProductId))
  const transferQty = Number(form.quantity || 0)
  const availableTotal = sourceInventories.reduce((total, inventory) => total + Number(inventory.quantity ?? 0), 0)
  const remainingAfterTransfer = Math.max(0, Number(selectedInventory?.quantity ?? 0) - transferQty)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const sourceWarehouse = warehouses.find((warehouse) => String(warehouse.id) === String(form.source_warehouse_id))
    const destinationWarehouse = warehouses.find((warehouse) => String(warehouse.id) === String(form.dest_warehouse_id))
    const inventory = sourceInventories.find((inventory) => String(inventory.product_id) === String(selectedProductId))

    if (!sourceWarehouse || !destinationWarehouse || !inventory) {
      setError(t.transferMissingSelection)
      return
    }

    if (sourceWarehouse.id === destinationWarehouse.id) {
      setError(t.transferSameWarehouse)
      return
    }

    if (Number(form.quantity) > Number(inventory.quantity)) {
      setError(`${t.transferExceedsStock} (${inventory.quantity}).`)
      return
    }

    setTransferDraft({
      source_warehouse_id: Number(form.source_warehouse_id),
      dest_warehouse_id: Number(form.dest_warehouse_id),
      sourceWarehouse,
      destinationWarehouse,
      items: [
        {
          product_id: Number(selectedProductId),
          quantity: Number(form.quantity),
          product: inventory.product,
          available: inventory.quantity,
        },
      ],
    })
    navigate('/transfer/review')
  }

  function handleScannedProduct(product) {
    const inventory = sourceInventories.find((item) => String(item.product_id) === String(product.id))

    if (!inventory) {
      setError(t.scannedProductNoStock)
      return
    }

    setError('')
    setForm((current) => ({ ...current, product_id: String(product.id) }))
  }

  const transferSteps = [t.warehouse, t.product, t.quantityLabel, t.review]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ims-slate">Transfer</p>
          <h2 className="text-2xl font-bold text-ims-navy">{t.transferMutationTitle}</h2>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/transfer">{t.cancel}</Link>
        </Button>
      </section>

      {/* Stepper */}
      <div className="flex items-center justify-between rounded-3xl border border-ims-slate/20 bg-white p-4">
        {transferSteps.map((step, index) => (
          <div key={step} className="flex flex-col items-center gap-2 lg:flex-1 lg:flex-row">
            <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black shadow-sm ${index === 0 || index === 1 || index === 2 ? 'bg-ims-navy text-white shadow-ims-navy/20' : 'bg-ims-cream/40 text-ims-slate'}`}>
              {index + 1}
            </div>
            <span className={`text-[10px] font-bold uppercase lg:text-xs ${index === 0 || index === 1 || index === 2 ? 'text-ims-navy' : 'text-ims-slate'}`}>
              {step}
            </span>
            {index < transferSteps.length - 1 ? <span className="hidden h-px flex-1 bg-ims-slate/20 lg:block" /> : null}
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-[10px] border border-ims-danger/20 bg-ims-danger/10 p-3 text-sm text-ims-danger">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2} label={t.sourceWarehouse} value={warehouses.length.toLocaleString('en-US')} helper={t.availableLocations} tone="blue" />
        <MetricCard icon={PackageCheck} label={t.available} value={sourceInventories.length.toLocaleString('en-US')} helper="Stok > 0" tone="navy" />
        <MetricCard icon={PackageCheck} label={t.totalInventory} value={availableTotal.toLocaleString('en-US')} helper={t.sourceWarehouse} tone="success" />
        <MetricCard icon={ArrowRight} label={t.transferQuantity} value={transferQty.toLocaleString('en-US')} helper={`${t.remaining}: ${remainingAfterTransfer.toLocaleString('en-US')}`} tone="warning" />
      </section>

      <OperationsChartGrid
        bar={{
          title: t.sourceWarehouseCapacity,
          subtitle: t.topTransferItems,
          labels: sourceInventories.slice(0, 6).map((inventory) => inventory.product?.sku ?? inventory.product?.name ?? t.items),
          emptyText: isLoading ? t.loading : t.noInventoryData,
          series: [{ label: t.stock, values: sourceInventories.slice(0, 6).map((inventory) => Number(inventory.quantity ?? 0)), className: 'bg-ims-blue' }],
        }}
        donut={{
          title: t.transferPlan,
          subtitle: t.transferPlanSubtitle,
          centerLabel: t.qty,
          centerValue: transferQty.toLocaleString('en-US'),
          emptyText: isLoading ? t.loading : t.chooseItem,
          items: [
            { label: t.transferQuantity, value: selectedInventory ? transferQty : 0, color: '#D97706', displayValue: transferQty.toLocaleString('en-US') },
            { label: t.remainingStock, value: selectedInventory ? remainingAfterTransfer : 0, color: '#047857', displayValue: remainingAfterTransfer.toLocaleString('en-US') },
          ],
        }}
      />

      {/* Form Container */}
      <div className="rounded-3xl border border-ims-slate/20 bg-white">
        <div className="border-b border-ims-slate/20 p-5">
          <h3 className="text-sm font-bold text-ims-navy">{t.transferDetails}</h3>
          <p className="mt-1 text-xs text-ims-slate">
            {isLoading ? t.transferDetailsLoading : t.transferDetailsDescription}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Source WH */}
            <div className="rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ims-slate" htmlFor="source_warehouse_id">
                {t.sourceWarehouse}
              </label>
              <Select
                id="source_warehouse_id"
                name="source_warehouse_id"
                className="bg-white font-semibold"
                value={form.source_warehouse_id}
                onChange={handleChange}
                disabled={isLoading}
              >
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
              </Select>
            </div>

            {/* Destination WH */}
            <div className="rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ims-slate" htmlFor="dest_warehouse_id">
                {t.destinationWarehouse}
              </label>
              <Select
                id="dest_warehouse_id"
                name="dest_warehouse_id"
                className="bg-white font-semibold"
                value={form.dest_warehouse_id}
                onChange={handleChange}
                disabled={isLoading}
              >
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
              </Select>
            </div>
          </div>

          <div className="my-6 h-px w-full bg-ims-slate/20" />

          {/* Product Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-ims-slate" htmlFor="product_id">{t.chooseItem}</label>
              <Select
                id="product_id"
                name="product_id"
                className="h-11 bg-ims-cream/25 font-semibold"
                value={selectedProductId}
                onChange={handleChange}
                disabled={isLoading}
              >
                {sourceInventories.length === 0 && <option value="">{t.noInventoryData}</option>}
                {sourceInventories.map((inventory) => (
                  <option key={inventory.id} value={inventory.product_id}>
                    {inventory.product?.sku} - {inventory.product?.name} ({t.available}: {inventory.quantity})
                  </option>
                ))}
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-ims-slate" htmlFor="quantity">{t.quantityLabel}</label>
              <Input 
                id="quantity" 
                name="quantity" 
                className="w-[150px] font-mono text-base font-bold"
                min="1" 
                type="number" 
                value={form.quantity} 
                onChange={handleChange} 
                disabled={isLoading || sourceInventories.length === 0}
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-ims-slate/20 pt-5">
            <Button type="button" variant="ghost" asChild>
              <Link to="/transfer"><ArrowLeft size={16} className="mr-2" /> {t.back}</Link>
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <ScannerActionButton onProductFound={handleScannedProduct} />
              <Button type="submit" disabled={isLoading || sourceInventories.length === 0}>
                {t.continueToReview} <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TransferForm
