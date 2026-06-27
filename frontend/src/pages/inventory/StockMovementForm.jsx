import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BarChart3, Camera, CheckCircle2, PackageMinus, PackagePlus, Warehouse } from 'lucide-react'
import { inventoryApi } from '@/api/inventory'
import { movementsApi } from '@/api/movements'
import { productsApi } from '@/api/products'
import { warehousesApi } from '@/api/warehouses'
import { BarTrendPanel, DonutPanel, MetricCard } from '@/components/analytics/OperationalCharts'
import ScannerActionButton from '@/components/scanner/ScannerActionButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'

const initialForm = {
  product_id: '',
  warehouse_id: '',
  quantity: '',
  unit_cost: '',
  reference_no: '',
  location_bin: '',
  received_date: '',
}

function groupProductOptions(products) {
  const byMethod = new Map()
  products.forEach((product) => {
    const method = product.cost_method ?? (product.valuation_method === 'fifo' ? 'FIFO' : 'AVERAGE')
    byMethod.set(method, (byMethod.get(method) ?? 0) + 1)
  })
  return Array.from(byMethod.entries()).map(([label, value], index) => ({
    label,
    value,
    color: ['#4B5694', '#047857', '#D97706'][index] ?? '#4B5694',
    displayValue: value.toLocaleString('en-US'),
  }))
}

function optionTrend(products, warehouses, isStockIn) {
  const productCount = products.length
  const warehouseCount = warehouses.length
  const labels = isStockIn
    ? ['Produk', 'Gudang', 'Batch', 'Cost']
    : ['Produk', 'Gudang', 'Stok', 'Validasi']

  return {
    labels,
    values: [
      productCount,
      warehouseCount,
      Math.max(0, Math.round(productCount * 0.6)),
      Math.max(0, Math.round(warehouseCount * 1.4)),
    ],
  }
}

function MovementWorkbenchTable({ form, isStockIn, products, warehouses, t, availableQty }) {
  const selectedProduct = products.find((product) => String(product.id) === String(form.product_id))
  const selectedWarehouse = warehouses.find((warehouse) => String(warehouse.id) === String(form.warehouse_id))
  const rows = [
    {
      key: 'product',
      label: t.product,
      value: selectedProduct ? `${selectedProduct.sku} - ${selectedProduct.name}` : t.selectProduct,
      detail: selectedProduct?.cost_method ?? selectedProduct?.valuation_method ?? '-',
    },
    {
      key: 'warehouse',
      label: t.warehouse,
      value: selectedWarehouse ? `${selectedWarehouse.code} - ${selectedWarehouse.name}` : t.selectWarehouse,
      detail: form.location_bin || '-',
    },
    {
      key: 'quantity',
      label: t.quantity,
      value: Number(form.quantity || 0).toLocaleString('en-US'),
      detail: !isStockIn && availableQty !== null ? `${t.availableQty}: ${Number(availableQty).toLocaleString('en-US')}` : t.unitsCount,
    },
    {
      key: 'reference',
      label: t.referenceNo,
      value: form.reference_no || '-',
      detail: isStockIn ? (form.received_date || '-') : t.stockOut,
    },
  ]

  return (
    <section className="overflow-hidden rounded-3xl border border-ims-slate/20 bg-white">
      <div className="flex flex-col gap-2 border-b border-ims-slate/20 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-ims-navy">
            {isStockIn ? 'Stock In Workbench' : 'Stock Out Workbench'}
          </h3>
          <p className="text-sm text-ims-slate">
            {isStockIn ? 'Preview receipt detail sebelum dicatat.' : 'Preview dispatch detail sebelum stok keluar.'}
          </p>
        </div>
        <Badge variant={isStockIn ? 'success' : 'destructive'}>
          {isStockIn ? t.stockIn : t.stockOut}
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="ims-table-head border-b border-ims-slate/20">
            <tr>
              <th className="px-5 py-4">{t.type}</th>
              <th className="px-5 py-4">{t.description}</th>
              <th className="px-5 py-4">{t.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ims-slate/10">
            {rows.map((row) => (
              <tr key={row.key} className="transition-colors hover:bg-ims-cream/30">
                <td className="px-5 py-4 text-xs font-black uppercase tracking-wide text-ims-slate">{row.label}</td>
                <td className="px-5 py-4">
                  <p className="font-bold text-ims-navy">{row.value}</p>
                  <p className="mt-1 text-xs font-medium text-ims-slate">{row.detail}</p>
                </td>
                <td className="px-5 py-4">
                  <Badge variant={row.value === '-' || row.value === t.selectProduct || row.value === t.selectWarehouse ? 'outline' : 'success'}>
                    {row.value === '-' || row.value === t.selectProduct || row.value === t.selectWarehouse ? 'Pending' : 'Ready'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}


function StockMovementForm({ mode, isModal = false }) {
  const { t } = useLanguage()
  const isStockIn = mode === 'in'
  const [form, setForm] = useState(initialForm)
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [availableQty, setAvailableQty] = useState(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadOptions() {
      setIsLoadingOptions(true)

      try {
        const [productResponse, warehouseResponse] = await Promise.all([
          productsApi.list({ per_page: 100, status: 1 }),
          warehousesApi.list({ per_page: 100 }),
        ])

        if (!ignore) {
          setProducts(productResponse.data?.data ?? [])
          setWarehouses(warehouseResponse.data?.data ?? [])
        }
      } catch (error) {
        if (!ignore) setError(apiErrorMessage(error, 'Pilihan produk dan gudang belum dapat dimuat.'))
      } finally {
        if (!ignore) setIsLoadingOptions(false)
      }
    }

    loadOptions()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadAvailableQty() {
      if (isStockIn || !form.product_id || !form.warehouse_id) {
        setAvailableQty(null)
        return
      }

      try {
        const response = await inventoryApi.list({
          product_id: form.product_id,
          warehouse_id: form.warehouse_id,
          per_page: 100,
        })
        const total = (response.data?.data ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)

        if (!ignore) setAvailableQty(total)
      } catch {
        if (!ignore) setAvailableQty(0)
      }
    }

    loadAvailableQty()

    return () => {
      ignore = true
    }
  }, [form.product_id, form.warehouse_id, isStockIn])

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(form.product_id)),
    [form.product_id, products],
  )
  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse) => String(warehouse.id) === String(form.warehouse_id)),
    [form.warehouse_id, warehouses],
  )

  function setField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function validate() {
    if (!form.product_id || !form.warehouse_id || !form.quantity) {
      return 'Produk, gudang, dan kuantitas wajib diisi.'
    }

    if (Number(form.quantity) <= 0) {
      return 'Kuantitas harus lebih dari 0.'
    }

    if (isStockIn && form.unit_cost === '') {
      return 'Unit cost wajib diisi untuk stok masuk.'
    }

    if (isStockIn && Number(form.unit_cost) < 0) {
      return 'Unit cost tidak boleh negatif.'
    }

    if (!isStockIn && availableQty !== null && Number(form.quantity) > Number(availableQty)) {
      return `Stok tersedia hanya ${availableQty}.`
    }

    return ''
  }

  function submitIntent(event) {
    event.preventDefault()
    setMessage('')
    const validationError = validate()

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setConfirmOpen(true)
  }

  async function confirmSubmit() {
    setIsSubmitting(true)
    setError('')

    const payload = {
      product_id: Number(form.product_id),
      warehouse_id: Number(form.warehouse_id),
      quantity: Number(form.quantity),
      reference_no: form.reference_no || undefined,
      location_bin: form.location_bin || undefined,
    }

    if (isStockIn) {
      payload.unit_cost = Number(form.unit_cost)
      payload.received_date = form.received_date || undefined
    }

    try {
      await (isStockIn ? movementsApi.stockIn(payload) : movementsApi.stockOut(payload))
      setMessage(isStockIn ? 'Barang masuk berhasil dicatat.' : 'Barang keluar berhasil dicatat.')
      setForm(initialForm)
      setAvailableQty(null)
      setConfirmOpen(false)
    } catch (error) {
      setError(apiErrorMessage(error, isStockIn ? 'Stok masuk gagal disimpan.' : 'Stok keluar gagal disimpan.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleScannedProduct(product) {
    const productExists = products.some((item) => String(item.id) === String(product.id))
    if (!productExists) {
      setProducts((current) => [...current, product])
    }
    setField('product_id', String(product.id))
    setMessage(`${t.productDetail}: ${product.sku} - ${product.name}`)
  }

  const Icon = isStockIn ? PackagePlus : PackageMinus
  const distribution = useMemo(() => groupProductOptions(products), [products])
  const trend = useMemo(() => optionTrend(products, warehouses, isStockIn), [products, warehouses, isStockIn])

  return (
    <div className={isModal ? 'space-y-4' : 'space-y-4 lg:space-y-6'}>
      {!isModal ? (
      <section className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ims-slate">{isStockIn ? t.stockIn : t.stockOut}</p>
          <h2 className="text-xl font-black text-ims-navy lg:text-2xl">{isStockIn ? t.inputStockIn : t.inputStockOut}</h2>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/inventory"><ArrowLeft size={16} /> {t.inventory}</Link>
        </Button>
      </section>
      ) : null}

      {!isModal ? (
      <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Icon}
          label={isStockIn ? t.stockIn : t.stockOut}
          value={Number(form.quantity || 0).toLocaleString('en-US')}
          helper={t.quantity}
          tone={isStockIn ? 'success' : 'danger'}
        />
        <MetricCard
          icon={Warehouse}
          label={t.warehouses}
          value={warehouses.length.toLocaleString('en-US')}
          helper={t.selectWarehouse}
          tone="blue"
        />
        <MetricCard
          icon={BarChart3}
          label={t.products}
          value={products.length.toLocaleString('en-US')}
          helper={t.selectProduct}
          tone="navy"
        />
        <MetricCard
          icon={Camera}
          label={t.scanBarcode}
          value="Modal"
          helper={isStockIn ? t.saveStockIn : t.saveStockOut}
          tone="warning"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BarTrendPanel
            title={isStockIn ? 'Inbound Readiness' : 'Outbound Readiness'}
            subtitle={isStockIn ? 'Produk, gudang, batch, dan cost readiness' : 'Produk, gudang, stok, dan validasi transaksi'}
            labels={trend.labels}
            emptyText={isLoadingOptions ? t.loading : t.noDataActiveFilters}
            series={[
              {
                label: isStockIn ? t.stockIn : t.stockOut,
                values: trend.values,
                className: isStockIn ? 'bg-ims-success' : 'bg-ims-danger',
              },
            ]}
          />
        </div>
        <DonutPanel
          title={isStockIn ? 'Receipt Sources' : 'Dispatch Reasons'}
          subtitle={t.costMethod}
          centerLabel={t.products}
          centerValue={products.length.toLocaleString('en-US')}
          emptyText={isLoadingOptions ? t.loading : t.noDataActiveFilters}
          items={distribution}
        />
      </section>
      </>
      ) : null}

      {!isModal ? (
      <MovementWorkbenchTable
        form={form}
        isStockIn={isStockIn}
        products={products}
        warehouses={warehouses}
        t={t}
        availableQty={availableQty}
      />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon size={18} />
            {isStockIn ? t.receivingForm : t.issuingForm}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submitIntent}>
            {error ? <p className="rounded-lg border border-ims-danger/20 bg-ims-danger/10 p-3 text-xs text-ims-danger">{error}</p> : null}
            {message ? <p className="rounded-lg border border-ims-success/20 bg-ims-success/10 p-3 text-xs font-semibold text-ims-success">{message}</p> : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product_id">Produk</Label>
                <Select id="product_id" value={form.product_id} onChange={(event) => setField('product_id', event.target.value)} disabled={isLoadingOptions}>
                  <option value="">{t.selectProduct}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouse_id">Gudang</Label>
                <Select id="warehouse_id" value={form.warehouse_id} onChange={(event) => setField('warehouse_id', event.target.value)} disabled={isLoadingOptions}>
                  <option value="">{t.selectWarehouse}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            {!isStockIn ? (
              <div className="rounded-2xl border border-ims-slate/20 bg-ims-cream/35 p-3 text-xs font-bold text-ims-navy">
                {t.availableQty}: {availableQty === null ? t.chooseProductWarehouse : Number(availableQty).toLocaleString('en-US')}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">{t.quantity}</Label>
                <Input id="quantity" min="1" type="number" value={form.quantity} onChange={(event) => setField('quantity', event.target.value)} />
              </div>

              {isStockIn ? (
                <div className="space-y-2">
                  <Label htmlFor="unit_cost">{t.unitCost}</Label>
                  <Input id="unit_cost" min="0" step="0.01" type="number" value={form.unit_cost} onChange={(event) => setField('unit_cost', event.target.value)} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="reference_no">{t.referenceNo}</Label>
                  <Input id="reference_no" value={form.reference_no} onChange={(event) => setField('reference_no', event.target.value)} placeholder="SO-001" />
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {isStockIn ? (
                <div className="space-y-2">
                  <Label htmlFor="reference_no">{t.referenceNo}</Label>
                  <Input id="reference_no" value={form.reference_no} onChange={(event) => setField('reference_no', event.target.value)} placeholder="PO-001" />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="location_bin">{t.locationBin}</Label>
                <Input id="location_bin" value={form.location_bin} onChange={(event) => setField('location_bin', event.target.value)} placeholder="Aisle 1, Bin A1" />
              </div>

              {isStockIn ? (
                <div className="space-y-2">
                  <Label htmlFor="received_date">{t.receivedDate}</Label>
                  <Input id="received_date" type="date" value={form.received_date} onChange={(event) => setField('received_date', event.target.value)} />
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 rounded-3xl border border-ims-slate/20 bg-ims-cream/25 p-3 sm:grid-cols-[1fr_auto]">
              <ScannerActionButton
                buttonClassName="h-11 w-full justify-center border-ims-blue/30 bg-white text-ims-blue hover:bg-ims-blue/10 sm:w-auto"
                buttonLabel={t.scanBarcode}
                onProductFound={handleScannedProduct}
              />
              <Button className="w-full sm:w-auto" type="submit" isLoading={isSubmitting}>
                <CheckCircle2 size={16} />
                {isSubmitting ? t.saving : isStockIn ? t.saveStockIn : t.saveStockOut}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmSubmit}
        isLoading={isSubmitting}
        title={isStockIn ? t.confirmStockIn : t.confirmStockOut}
        description={`${isStockIn ? t.increase : t.decrease} ${Number(form.quantity).toLocaleString('en-US')} ${t.unitsCount.toLowerCase()} ${selectedProduct?.name} ${t.atWarehouse} ${selectedWarehouse?.name}. ${t.movementLedgerNote}`}
        confirmLabel={isStockIn ? t.saveStockIn : t.saveStockOut}
      />
    </div>
  )
}

export default StockMovementForm
