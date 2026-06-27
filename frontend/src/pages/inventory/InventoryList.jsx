import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Archive, PackageCheck, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { inventoryApi } from '@/api/inventory'
import { warehousesApi } from '@/api/warehouses'
import { MetricCard, OperationsChartGrid } from '@/components/analytics/OperationalCharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableSkeleton, CardSkeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('en-US')
}

function sortValue(item, key) {
  if (key === 'sku') return item.product?.sku ?? ''
  if (key === 'product') return item.product?.name ?? ''
  if (key === 'warehouse') return item.warehouse?.code ?? item.warehouse?.name ?? ''
  if (key === 'minimum_stock') return Number(item.product?.minimum_stock ?? 0)
  if (key === 'quantity') return Number(item.quantity ?? 0)
  if (key === 'status') return stockStatus(item)
  return ''
}

function compareInventoryRows(a, b, key, direction) {
  const first = sortValue(a, key)
  const second = sortValue(b, key)
  const multiplier = direction === 'desc' ? -1 : 1

  if (typeof first === 'number' && typeof second === 'number') {
    return (first - second) * multiplier
  }

  return String(first).localeCompare(String(second), 'id', { numeric: true, sensitivity: 'base' }) * multiplier
}

function getInventoryColumns(t) {
  return [
    ['sku', 'SKU'],
    ['product', t.productName],
    ['warehouse', t.warehouse],
    ['minimum_stock', t.minStock],
    ['quantity', t.currentStock],
    ['status', t.status],
  ]
}

function getSortOptions(t) {
  return [
    ['product:asc', t.productNameAZ],
    ['product:desc', t.productNameZA],
    ['sku:asc', 'SKU A-Z'],
    ['sku:desc', 'SKU Z-A'],
    ['warehouse:asc', t.warehouseAZ],
    ['warehouse:desc', t.warehouseZA],
    ['minimum_stock:asc', t.minStockLowHigh],
    ['minimum_stock:desc', t.minStockHighLow],
    ['quantity:asc', t.currentStockLowHigh],
    ['quantity:desc', t.currentStockHighLow],
    ['status:asc', t.statusAZ],
    ['status:desc', t.statusZA],
  ]
}

function stockStatusLabel(t, status) {
  const normalized = String(status).toUpperCase().replaceAll(' ', '_')
  if (normalized === 'OUT_OF_STOCK') return t.outOfStock
  if (normalized === 'LOW_STOCK') return t.lowStock
  return t.inStock
}

function InventoryList() {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [items, setItems] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState('product:asc')
  const pageSize = 10
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [sortKey, sortDirection] = sortOrder.split(':')
  const inventoryColumns = getInventoryColumns(t)
  const sortOptions = getSortOptions(t)

  useEffect(() => {
    let ignore = false
    async function loadWarehouses() {
      try {
        const res = await warehousesApi.list({ per_page: 100 })
        if (!ignore) {
          setWarehouses(res.data?.data ?? [])
        }
      } catch {
        // Filters can still render without warehouse options.
      }
    }
    loadWarehouses()
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadInventory() {
      setIsLoading(true)
      setError('')

      try {
        const response = await inventoryApi.list({
          page,
          per_page: pageSize,
          search: search || undefined,
          warehouse_id: warehouseFilter || undefined,
          stock_status: statusFilter === 'ALL' ? undefined : statusFilter,
        })

        if (!ignore) {
          const payload = response.data ?? {}

          setItems(payload.data ?? [])
          setMeta({
            current_page: Number(payload.current_page ?? page),
            last_page: Number(payload.last_page ?? 1),
            total: Number(payload.total ?? 0),
          })
        }
      } catch (error) {
        if (!ignore) {
          setError(apiErrorMessage(error, 'Inventory belum dapat dimuat dari API.'))
        }
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    const timer = setTimeout(loadInventory, 300)
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [search, warehouseFilter, statusFilter, page, pageSize])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => compareInventoryRows(a, b, sortKey, sortDirection))
  }, [items, sortKey, sortDirection])

  const paginatedItems = sortedItems
  const inventorySummary = useMemo(() => {
    const totalStock = items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
    const inStock = items.filter((item) => stockStatus(item) === 'IN STOCK').length
    const lowStock = items.filter((item) => stockStatus(item) === 'LOW STOCK').length
    const outOfStock = items.filter((item) => stockStatus(item) === 'OUT OF STOCK').length

    return { totalRows: meta.total, totalStock, inStock, lowStock, outOfStock }
  }, [items, meta.total])

  const chartLabels = [t.inStock, t.lowStock, t.outOfStock]
  const chartValues = [inventorySummary.inStock, inventorySummary.lowStock, inventorySummary.outOfStock]

  function updateSearch(value) {
    setSearch(value)
    setPage(1)
  }

  function updateWarehouse(value) {
    setWarehouseFilter(value)
    setPage(1)
  }

  function updateStatus(value) {
    setStatusFilter(value)
    setPage(1)
  }

  function updateSortOrder(value) {
    setSortOrder(value)
    setPage(1)
  }

  function toggleColumnSort(key) {
    const nextDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortOrder(`${key}:${nextDirection}`)
    setPage(1)
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      {error ? (
        <div className="rounded-lg border border-ims-danger/20 bg-ims-danger/10 p-3 text-xs text-ims-danger">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={PackageCheck} label={t.totalRecords} value={formatNumber(inventorySummary.totalRows)} helper={t.inventory} tone="blue" />
        <MetricCard icon={Archive} label={t.totalInventory} value={formatNumber(inventorySummary.totalStock)} helper={t.unitsCount} tone="navy" />
        <MetricCard icon={AlertCircle} label={t.lowStock} value={formatNumber(inventorySummary.lowStock)} helper={t.items} tone="warning" />
        <MetricCard icon={AlertCircle} label={t.outOfStock} value={formatNumber(inventorySummary.outOfStock)} helper={t.items} tone="danger" />
      </section>

      <OperationsChartGrid
        bar={{
          title: 'Inventory Stock Mix',
          subtitle: 'Distribusi status stok dari data inventori aktif',
          labels: chartLabels,
          emptyText: isLoading ? t.loading : t.noInventoryData,
          series: [{ label: t.records, values: chartValues, className: 'bg-ims-blue' }],
        }}
        donut={{
          title: 'Operational Mix',
          subtitle: 'Komposisi status stok saat ini',
          centerLabel: t.records,
          centerValue: formatNumber(chartValues.reduce((sum, value) => sum + value, 0)),
          emptyText: isLoading ? t.loading : t.noInventoryData,
          items: [
            { label: t.inStock, value: inventorySummary.inStock, color: '#047857', displayValue: formatNumber(inventorySummary.inStock) },
            { label: t.lowStock, value: inventorySummary.lowStock, color: '#D97706', displayValue: formatNumber(inventorySummary.lowStock) },
            { label: t.outOfStock, value: inventorySummary.outOfStock, color: '#B91C1C', displayValue: formatNumber(inventorySummary.outOfStock) },
          ],
        }}
      />

      <section className="overflow-hidden rounded-3xl border border-ims-slate/20 bg-white">
        <div className="flex flex-col gap-3 border-b border-ims-slate/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap gap-3">
            <div className="relative w-full sm:w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ims-slate/80" size={14} />
              <Input
                className="h-10 border-ims-slate/20 bg-white pl-9 text-[13px]"
                placeholder={t.searchSkuProduct}
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
              />
            </div>
            <Select className="w-full text-[13px] sm:w-[180px]" value={warehouseFilter} onChange={(event) => updateWarehouse(event.target.value)}>
              <option value="">{t.allWarehouses}</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </Select>
            <Select className="w-full text-[13px] sm:w-[160px]" value={statusFilter} onChange={(event) => updateStatus(event.target.value)}>
              <option value="ALL">{t.stock}: {t.allStatus}</option>
              <option value="IN_STOCK">{t.stock}: {t.inStock}</option>
              <option value="LOW_STOCK">{t.stock}: {t.lowStock}</option>
              <option value="OUT_OF_STOCK">{t.stock}: {t.outOfStock}</option>
            </Select>
            <Select className="w-full text-[13px] sm:w-[230px]" value={sortOrder} onChange={(event) => updateSortOrder(event.target.value)}>
              {sortOptions.map(([value, label]) => (
                <option key={value} value={value}>{t.sortPrefix}: {label}</option>
              ))}
            </Select>
          </div>

        </div>

        <div className="hidden overflow-x-auto lg:block">
          {isLoading ? (
            <TableSkeleton rows={8} cols={inventoryColumns.length} />
          ) : (
            <div className="flex flex-col">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="ims-table-head border-b border-ims-slate/20">
                  <tr>
                    {inventoryColumns.map(([key, label]) => (
                      <th key={key} className="px-6 py-4">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-ims-navy"
                          onClick={() => toggleColumnSort(key)}
                        >
                          {label}
                          {sortKey === key ? (
                            sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={12} className="text-ims-slate/40" />
                          )}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ims-slate/20">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td className="px-6 py-8 text-center text-sm text-ims-slate" colSpan={inventoryColumns.length}>
                        {t.noInventoryData}
                      </td>
                    </tr>
                  ) : null}
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-ims-cream/25">
                      <td className="px-6 py-5 font-mono text-[13px] font-bold text-ims-navy">{item.product?.sku ?? '-'}</td>
                      <td className="px-6 py-5 text-[13px] font-black text-ims-navy">{item.product?.name ?? '-'}</td>
                      <td className="px-6 py-5 text-[13px] font-medium text-ims-navy/80">{item.warehouse?.code ?? item.warehouse?.name ?? '-'}</td>
                      <td className="px-6 py-5 text-[13px] font-medium text-ims-navy/80">{formatNumber(item.product?.minimum_stock)}</td>
                      <td className="px-6 py-5 text-[14px] font-bold text-ims-navy">{formatNumber(item.quantity)}</td>
                      <td className="px-6 py-5">{renderStockBadge(item, t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <DesktopPagination meta={meta} page={page} pageSize={pageSize} setPage={setPage} t={t} />
            </div>
          )}
        </div>

        <div className="space-y-2 lg:hidden">
          {isLoading ? (
            <CardSkeleton count={4} />
          ) : paginatedItems.length === 0 ? (
            <div className="rounded-3xl border border-ims-slate/20 bg-white p-4 text-center">
              <p className="text-xs text-ims-slate">{t.noInventoryData}</p>
            </div>
          ) : null}
          {!isLoading && paginatedItems.map((item) => (
            <article key={item.id} className="rounded-3xl border border-ims-slate/20 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-ims-navy">{item.product?.name ?? '-'}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ims-slate">{item.product?.sku ?? '-'}</p>
                </div>
                {renderStockBadge(item, t)}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-ims-cream/40 p-2">
                  <p className="text-[9px] font-black uppercase tracking-wide text-ims-slate">{t.warehouse}</p>
                  <p className="mt-0.5 text-xs font-bold text-ims-navy">{item.warehouse?.code ?? item.warehouse?.name ?? '-'}</p>
                </div>
                <div className="rounded-md bg-ims-cream/40 p-2">
                  <p className="text-[9px] font-black uppercase tracking-wide text-ims-slate">{t.currentStock}</p>
                  <p className="mt-0.5 text-xs font-bold text-ims-navy">{formatNumber(item.quantity)}</p>
                </div>
                <div className="rounded-md bg-ims-cream/40 p-2">
                  <p className="text-[9px] font-black uppercase tracking-wide text-ims-slate">{t.minStock}</p>
                  <p className="mt-0.5 text-xs font-bold text-ims-navy">{formatNumber(item.product?.minimum_stock)}</p>
                </div>
                <div className="rounded-md bg-ims-cream/40 p-2">
                  <p className="text-[9px] font-black uppercase tracking-wide text-ims-slate">{t.status}</p>
                  <p className="mt-0.5 text-xs font-bold text-ims-navy">{stockStatusLabel(t, stockStatus(item))}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <MobilePagination meta={meta} page={page} pageSize={pageSize} setPage={setPage} t={t} />
      </section>
    </div>
  )
}

function stockStatus(item) {
  const isOut = Number(item.quantity) === 0
  const isLow = Number(item.quantity) <= Number(item.product?.minimum_stock ?? 0)

  if (isOut) return 'OUT OF STOCK'
  if (isLow) return 'LOW STOCK'
  return 'IN STOCK'
}

function renderStockBadge(item, t) {
  const status = stockStatus(item)

  if (status === 'OUT OF STOCK') {
    return (
      <Badge variant="outline" className="rounded-[4px] border-none bg-ims-danger/10 px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-ims-danger shadow-none">
        {t.outOfStock}
      </Badge>
    )
  }

  if (status === 'LOW STOCK') {
    return (
      <Badge variant="outline" className="rounded-[4px] border-none bg-ims-warning/10 px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-ims-warning shadow-none">
        {t.lowStock}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="rounded-[4px] border-none bg-ims-success/10 px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-ims-success shadow-none">
      {t.inStock}
    </Badge>
  )
}

function DesktopPagination({ meta, page, pageSize, setPage, t }) {
  const start = meta.total === 0 ? 0 : ((page - 1) * pageSize) + 1
  const end = Math.min(page * pageSize, meta.total)

  return (
    <div className="flex items-center justify-between border-t border-ims-slate/10 px-6 py-4">
      <div className="text-[12px] font-medium text-ims-navy/80">
        {t.showing} {start} {t.to} {end} {t.of} {meta.total.toLocaleString('en-US')} {t.records}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          disabled={page <= 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-ims-slate/20 text-ims-slate transition-colors hover:bg-ims-cream/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-[10px]">{'<'}</span>
        </button>
        <div className="flex items-center gap-1">
          <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-ims-blue text-[12px] font-bold text-white">
            {page}
          </button>
          {meta.last_page > page ? (
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[12px] font-semibold text-ims-navy/80 transition-colors hover:bg-ims-cream/25" onClick={() => setPage((value) => value + 1)}>
              {page + 1}
            </button>
          ) : null}
          {meta.last_page > page + 1 ? (
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[12px] font-semibold text-ims-navy/80 transition-colors hover:bg-ims-cream/25" onClick={() => setPage((value) => value + 2)}>
              {page + 2}
            </button>
          ) : null}
          {meta.last_page > page + 2 ? (
            <span className="flex h-8 w-8 items-center justify-center text-[12px] font-medium text-ims-slate/50">...</span>
          ) : null}
          {meta.last_page > page + 3 ? (
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[12px] font-semibold text-ims-navy/80 transition-colors hover:bg-ims-cream/25" onClick={() => setPage(meta.last_page)}>
              {meta.last_page}
            </button>
          ) : null}
        </div>
        <button
          disabled={page >= meta.last_page}
          onClick={() => setPage((value) => value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-ims-slate/20 text-ims-slate transition-colors hover:bg-ims-cream/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-[10px]">{'>'}</span>
        </button>
      </div>
    </div>
  )
}

function MobilePagination({ meta, page, pageSize, setPage, t }) {
  const start = meta.total === 0 ? 0 : ((page - 1) * pageSize) + 1
  const end = Math.min(page * pageSize, meta.total)

  return (
    <div className="flex items-center justify-between pt-4 pb-2 lg:hidden">
      <div className="text-[12px] text-ims-navy/80">
        {t.showing} {start} {t.to} {end} {t.of} {meta.total.toLocaleString('en-US')}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-[12px]"
          disabled={page <= 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
        >
          {t.previous}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-[12px]"
          disabled={page >= meta.last_page}
          onClick={() => setPage((value) => value + 1)}
        >
          {t.next}
        </Button>
      </div>
    </div>
  )
}

export default InventoryList
