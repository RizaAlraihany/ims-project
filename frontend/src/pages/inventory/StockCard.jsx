import { useEffect, useState, useMemo } from 'react'
import { ArrowDown, ArrowUp, Layers3, PackageCheck, Search } from 'lucide-react'
import { inventoryApi } from '@/api/inventory'
import { productsApi } from '@/api/products'
import { warehousesApi } from '@/api/warehouses'
import { MetricCard, OperationsChartGrid, ChartFilter } from '@/components/analytics/OperationalCharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'
import { trendLabels, monthlyLabels, movementBucketIndex } from '@/utils/chartHelpers'


function movementTone(type) {
  return {
    IN: 'default',
    OUT: 'warning',
    TRANSFER: 'outline',
  }[type] ?? 'outline'
}

function movementLabel(type, t) {
  return {
    IN: t.stockIn,
    OUT: t.stockOut,
    TRANSFER: t.transfer,
  }[type] ?? type
}

const emptyArray = []

function StockCard() {
  const { t } = useLanguage()
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [stockCard, setStockCard] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('weekly')
  const isWeekly = period === 'weekly'

  useEffect(() => {
    let ignore = false

    async function loadOptions() {
      try {
        const [productResponse, warehouseResponse] = await Promise.all([
          productsApi.list({ per_page: 100, status: 1 }),
          warehousesApi.list({ per_page: 100 }),
        ])

        if (!ignore) {
          const nextProducts = productResponse.data?.data ?? []
          setProducts(nextProducts)
          setWarehouses(warehouseResponse.data?.data ?? [])
        }
      } catch (error) {
        if (!ignore) setError(apiErrorMessage(error, 'Pilihan stock card belum dapat dimuat.'))
      }
    }

    loadOptions()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadStockCard() {
      if (!productId) {
        setStockCard(null)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const response = await inventoryApi.stockCard({
          product_id: productId,
          warehouse_id: warehouseId || undefined,
        })

        if (!ignore) setStockCard(response.data.data)
      } catch (error) {
        if (!ignore) setError(apiErrorMessage(error, 'Stock card belum dapat dimuat.'))
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadStockCard()

    return () => {
      ignore = true
    }
  }, [productId, refreshKey, warehouseId])

  const movements = stockCard?.movements ?? emptyArray
  const batches = stockCard?.batches ?? emptyArray
  const movementSummary = movements.reduce((total, movement) => {
    const quantity = Math.abs(Number(movement.signed_quantity ?? movement.quantity ?? 0))

    return {
      inQty: total.inQty + (movement.type === 'IN' ? quantity : 0),
      outQty: total.outQty + (movement.type === 'OUT' ? quantity : 0),
      transferQty: total.transferQty + (movement.type === 'TRANSFER' ? quantity : 0),
    }
  }, { inQty: 0, outQty: 0, transferQty: 0 })
  
  const chartLabels = isWeekly ? trendLabels : monthlyLabels
  
  const chartValues = useMemo(() => {
    const length = isWeekly ? 7 : 4
    const values = Array.from({ length }, () => 0)
    
    movements.forEach((movement) => {
      const index = movementBucketIndex(movement.created_at, isWeekly)
      if (index >= 0) {
        values[index] += Math.abs(Number(movement.signed_quantity ?? movement.quantity ?? 0))
      }
    })
    
    return values
  }, [movements, isWeekly])
  
  const totalBatchQty = batches.reduce((total, batch) => total + Number(batch.remaining_qty ?? 0), 0)

  return (
    <div className="space-y-4 lg:space-y-6">


      {error ? <p className="rounded-lg border border-ims-danger/20 bg-ims-danger/10 p-3 text-xs text-ims-danger">{error}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={PackageCheck} label={t.currentStock} value={Number(stockCard?.current_stock ?? 0).toLocaleString('en-US')} helper={stockCard?.product?.sku ?? t.selectProduct} tone="blue" />
        <MetricCard icon={ArrowDown} label={t.stockIn} value={movementSummary.inQty.toLocaleString('en-US')} helper={t.qty} tone="success" />
        <MetricCard icon={ArrowUp} label={t.stockOut} value={movementSummary.outQty.toLocaleString('en-US')} helper={t.qty} tone="warning" />
        <MetricCard icon={Layers3} label={t.fifoBatches} value={batches.length.toLocaleString('en-US')} helper={`${totalBatchQty.toLocaleString('en-US')} ${t.remaining}`} tone="navy" />
      </section>

      <OperationsChartGrid
        bar={{
          title: t.movementLedger,
          subtitle: stockCard?.product?.name ?? t.selectProduct,
          labels: chartLabels,
          emptyText: isLoading ? t.loading : t.noActivities,
          action: <ChartFilter period={period} onChange={setPeriod} />,
          series: [{ label: t.qty, values: chartValues, className: 'bg-ims-blue' }],
        }}
        donut={{
          title: `${t.stockCard} Mix`,
          subtitle: t.movementLedger,
          centerLabel: t.qty,
          centerValue: (movementSummary.inQty + movementSummary.outQty + movementSummary.transferQty).toLocaleString('en-US'),
          emptyText: isLoading ? t.loading : t.noActivities,
          items: [
            { label: t.stockIn, value: movementSummary.inQty, color: '#047857', displayValue: movementSummary.inQty.toLocaleString('en-US') },
            { label: t.stockOut, value: movementSummary.outQty, color: '#D97706', displayValue: movementSummary.outQty.toLocaleString('en-US') },
            { label: t.transfer, value: movementSummary.transferQty, color: '#4B5694', displayValue: movementSummary.transferQty.toLocaleString('en-US') },
          ],
        }}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <CardHeader>
            <CardTitle>{t.movementLedger}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-4 rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <div className="space-y-2">
                <Label htmlFor="product_id">Produk</Label>
                <Select id="product_id" value={productId} onChange={(event) => setProductId(event.target.value)}>
                  <option value="">{t.selectProduct}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse_id">Gudang</Label>
                <Select id="warehouse_id" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
                  <option value="">{t.allWarehouses}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>
                  ))}
                </Select>
              </div>
              <Button type="button" disabled={isLoading || !productId} onClick={() => setRefreshKey((current) => current + 1)}>
                <Search size={16} />
                {isLoading ? t.loading : t.refresh}
              </Button>
            </div>

            <div className="mb-4 rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-ims-slate">{stockCard?.product?.sku ?? '-'}</p>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                <h3 className="text-lg font-black text-ims-navy">{stockCard?.product?.name ?? t.selectProduct}</h3>
                <p className="text-2xl font-black text-ims-blue">{Number(stockCard?.current_stock ?? 0).toLocaleString('en-US')}</p>
              </div>
            </div>

            <div className="hidden overflow-hidden rounded-lg border border-ims-slate/20 lg:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-ims-cream/25 text-[10px] uppercase tracking-wide text-ims-slate">
                  <tr>
                    <th className="px-3 py-3">{t.date}</th>
                    <th className="px-3 py-3">{t.reference}</th>
                    <th className="px-3 py-3">{t.type}</th>
                    <th className="px-3 py-3 text-right">{t.qty}</th>
                    <th className="px-3 py-3 text-right">{t.balance}</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr><td className="px-3 py-4 text-ims-slate" colSpan="5">{isLoading ? t.loading : t.noActivities}</td></tr>
                  ) : null}
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-t border-ims-slate/20">
                      <td className="px-3 py-3">{new Date(movement.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="px-3 py-3 font-mono">{movement.reference_no ?? '-'}</td>
                      <td className="px-3 py-3"><Badge variant={movementTone(movement.type)}>{movementLabel(movement.type, t)}</Badge></td>
                      <td className="px-3 py-3 text-right font-black">{Number(movement.signed_quantity ?? movement.quantity).toLocaleString('en-US')}</td>
                      <td className="px-3 py-3 text-right font-black text-ims-blue">{Number(movement.balance_after ?? 0).toLocaleString('en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 lg:hidden">
              {movements.length === 0 ? <p className="text-xs text-ims-slate">{isLoading ? t.loading : t.noActivities}</p> : null}
              {movements.map((movement) => (
                <article key={movement.id} className="rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={movementTone(movement.type)}>{movementLabel(movement.type, t)}</Badge>
                    <span className="font-mono text-[10px] text-ims-slate">{movement.reference_no ?? '-'}</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-xs text-ims-slate">{new Date(movement.created_at).toLocaleString('id-ID')}</p>
                    <p className="text-lg font-black text-ims-navy">{Number(movement.signed_quantity ?? movement.quantity).toLocaleString('en-US')}</p>
                  </div>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Layers3 size={17} /> {t.fifoBatches}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {batches.length === 0 ? <p className="text-xs text-ims-slate">{isLoading ? t.loading : t.noDataActiveFilters}</p> : null}
            {batches.map((batch) => (
              <div key={batch.id} className="rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-3">
                <p className="truncate font-mono text-[11px] font-black text-ims-navy">{batch.batch_number}</p>
                <p className="mt-2 text-xs text-ims-slate">{t.remaining}: <span className="font-black text-ims-navy">{Number(batch.remaining_qty ?? 0).toLocaleString('en-US')}</span></p>
                <p className="mt-1 text-xs text-ims-slate">{t.cost}: <span className="font-black text-ims-navy">{Number(batch.unit_cost ?? 0).toLocaleString('en-US')}</span></p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export default StockCard
