import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, Boxes, Building2, CircleAlert, CircleCheck, CircleX, Download, Layers3, PackagePlus, Pencil, Ruler, Search, Trash2, Upload, UsersRound } from 'lucide-react'
import { categoriesApi } from '@/api/categories'
import { contactsApi } from '@/api/contacts'
import { productsApi } from '@/api/products'
import { unitsApi } from '@/api/units'
import { warehousesApi } from '@/api/warehouses'
import { BarTrendPanel, ChartFilter, DonutPanel, MetricCard } from '@/components/analytics/OperationalCharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Drawer, DrawerFooter } from '@/components/ui/drawer'
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'

const emptyForms = {
  products: {
    category_id: '',
    unit_id: '',
    sku: '',
    barcode: '',
    name: '',
    minimum_stock: 0,
    cost_method: 'AVERAGE',
    status: true,
  },
  categories: {
    name: '',
    description: '',
  },
  units: {
    name: '',
    symbol: '',
  },
  warehouses: {
    code: '',
    name: '',
    address: '',
    manager_name: '',
    status: true,
  },
  contacts: {
    name: '',
    type: 'SUPPLIER',
    email: '',
    phone: '',
    address: '',
    status: true,
  },
}

function getTabs(t) {
  return [
    { key: 'products', label: t.dataBarang, singleLabel: t.product, title: t.productMaster, icon: Boxes },
    { key: 'categories', label: t.categories, singleLabel: t.category, title: t.categoryMaster, icon: Layers3 },
    { key: 'units', label: t.units, singleLabel: t.unit, title: t.unitMaster, icon: Ruler },
    { key: 'warehouses', label: t.dataGudang, singleLabel: t.warehouse, title: t.warehouseMaster, icon: Building2 },
    { key: 'contacts', label: t.dataKontak, singleLabel: t.contact, title: t.contactMaster, icon: UsersRound },
  ]
}

function getMasterColumns(t) {
  return {
    products: [
      ['sku', 'SKU'],
      ['name', t.productName],
      ['category', t.category],
      ['unit', t.unit],
      ['minimum_stock', t.minimum],
      ['status', t.status],
    ],
    categories: [
      ['name', t.name],
      ['description', t.description],
      ['products_count', t.products],
    ],
    units: [
      ['symbol', t.symbol],
      ['name', t.name],
      ['products_count', t.products],
    ],
    warehouses: [
      ['code', t.code],
      ['name', t.name],
      ['manager_name', t.manager],
      ['status', t.status],
    ],
    contacts: [
      ['name', t.name],
      ['type', t.type],
      ['email', t.email],
      ['phone', t.phone],
      ['status', t.status],
    ],
  }
}

function normalizeList(response) {
  const payload = response.data?.data
  const items = payload?.items ?? payload?.data ?? payload ?? []
  const pagination = payload?.pagination ?? payload ?? response.data ?? {}

  return {
    items: Array.isArray(items) ? items : [],
    meta: {
      current_page: pagination.current_page ?? pagination.currentPage ?? 1,
      last_page: pagination.last_page ?? pagination.lastPage ?? 1,
      total: pagination.total ?? (Array.isArray(items) ? items.length : 0),
    },
  }
}

function isActiveRow(item) {
  return !(item.status === false || item.status === 0 || item.status === '0')
}

function rowGroupLabel(activeTab, item) {
  if (activeTab === 'products') return item.category?.name ?? 'Tanpa kategori'
  if (activeTab === 'warehouses') return item.status === false ? 'Nonaktif' : 'Aktif'
  if (activeTab === 'categories') return item.name ?? 'Kategori'
  if (activeTab === 'units') return item.symbol ?? item.name ?? 'Satuan'
  return item.type ?? 'Kontak'
}

function summarizeMaster(activeTab, items, meta, t) {
  const total = Number(meta.total ?? items.length ?? 0)
  const activeRows = items.filter(isActiveRow).length
  const inactiveRows = Math.max(0, items.length - activeRows)
  const linkedProducts = items.reduce((sum, item) => sum + Number(item.products_count ?? 0), 0)
  const minimumStock = items.reduce((sum, item) => sum + Number(item.minimum_stock ?? 0), 0)
  const grouped = new Map()

  items.forEach((item) => {
    const label = rowGroupLabel(activeTab, item)
    grouped.set(label, (grouped.get(label) ?? 0) + 1)
  })

  const groupEntries = Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const titleMap = {
    products: t.dataBarang,
    categories: t.categories,
    units: t.units,
    warehouses: t.dataGudang,
    contacts: t.dataKontak,
  }

  return {
    total,
    activeRows,
    inactiveRows,
    linkedProducts,
    minimumStock,
    groupEntries,
    title: titleMap[activeTab],
  }
}

function productStockMeter(item) {
  const current = Number(item.current_stock ?? item.total_stock ?? item.stock ?? 0)
  const minimum = Number(item.minimum_stock ?? 0)
  const target = minimum > 0 ? minimum * 2 : Math.max(current, 1)
  const ratio = Math.max(8, Math.min(100, Math.round((current / target) * 100)))

  let tone = 'bg-ims-success'
  let label = 'Good'

  if (minimum > 0 && current < minimum) {
    tone = 'bg-ims-warning'
    label = 'Low'
  }

  if (minimum > 0 && current < minimum / 2) {
    tone = 'bg-ims-danger'
    label = 'Critical'
  }

  return { current, minimum, ratio, tone, label }
}

function hasStockValue(item) {
  return item.current_stock !== undefined || item.total_stock !== undefined || item.stock !== undefined
}

function productCatalogSummary(items, meta) {
  const totalProducts = Number(meta.total ?? items.length ?? 0)
  const stockedItems = items.filter(hasStockValue)
  const inStock = stockedItems.filter((item) => productStockMeter(item).current > 0).length
  const outOfStock = stockedItems.filter((item) => productStockMeter(item).current <= 0).length
  const lowStockItems = stockedItems.filter((item) => {
    const stock = productStockMeter(item)
    return stock.minimum > 0 && stock.current > 0 && stock.current < stock.minimum
  }).length

  return { totalProducts, lowStockItems, inStock, outOfStock }
}

function ProductCatalogStats({ summary, t }) {
  const cards = [
    { label: t.products, value: summary.totalProducts, tag: t.total, icon: Boxes, tone: 'bg-ims-blue/10 text-ims-blue', tagTone: 'bg-ims-cream text-ims-slate' },
    { label: t.lowStockItems, value: summary.lowStockItems, tag: t.actionRequired, icon: CircleAlert, tone: 'bg-ims-warning/10 text-ims-warning', tagTone: 'bg-ims-danger/10 text-ims-danger' },
    { label: t.inStock, value: summary.inStock, tag: t.available, icon: CircleCheck, tone: 'bg-ims-success/10 text-ims-success', tagTone: 'bg-ims-success/10 text-ims-success' },
    { label: t.outOfStock, value: summary.outOfStock, tag: t.reorder, icon: CircleX, tone: 'bg-ims-danger/10 text-ims-danger', tagTone: 'bg-ims-cream text-ims-slate' },
  ]

  return (
    <section className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <article key={card.label} className="min-h-[186px] rounded-3xl bg-white p-7 shadow-lg shadow-ims-navy/10">
            <div className="flex items-start justify-between gap-4">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl ${card.tone}`}>
                <Icon className="size-6" />
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${card.tagTone}`}>{card.tag}</span>
            </div>
            <div className="mt-7">
              <p className="text-[15px] font-semibold text-ims-slate">{card.label}</p>
              <p className="mt-2 text-[38px] font-black leading-none text-ims-navy">{Number(card.value).toLocaleString('en-US')}</p>
            </div>
          </article>
        )
      })}
    </section>
  )
}

function recentDayLabels() {
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: '2-digit' })
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    return formatter.format(date)
  })
}

function ProductInventoryCharts({ summary, t }) {
  const [period, setPeriod] = useState('monthly')
  const isWeekly = period === 'weekly'

  const labels = isWeekly 
    ? recentDayLabels() 
    : ['Jun 1-7', 'Jun 8-14', 'Jun 15-21', 'Jun 22-28']
    
  // Mock data for display to match screenshot structure
  const stockInValues = labels.map((_, index) => isWeekly ? Math.min(summary.inStock, index % 2 === 0 ? summary.inStock : summary.lowStockItems) : 0)
  const stockOutValues = labels.map((_, index) => isWeekly ? Math.min(summary.outOfStock, index % 2 === 0 ? summary.outOfStock : summary.lowStockItems) : 0)
  const maxValue = Math.max(1, ...stockInValues, ...stockOutValues)

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 rounded-3xl border border-ims-slate/20 bg-white p-6 lg:col-span-2">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-bold text-ims-navy">{t.stockTrends}</h3>
            <p className="text-sm text-ims-slate">{t.stockTrendsSubtitle}</p>
          </div>
          <ChartFilter period={period} onChange={setPeriod} />
        </div>

        <div className="mt-2 overflow-x-auto">
          <div className="relative h-[300px] min-w-[500px] pl-8 pr-2 pb-8">
            {/* Grid lines & Y axis */}
            <div className="absolute inset-0 pb-8 pl-8 pr-2">
              {Array.from({ length: 11 }, (_, index) => (
                <div key={index} className="absolute left-8 right-2 border-t border-ims-slate/10" style={{ bottom: `calc(2rem + ${index * 10}%)` }}>
                  <span className="absolute -left-6 -top-2.5 text-[10px] font-medium text-ims-slate/75">
                    {(index / 10).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bars Container */}
            <div className="absolute inset-x-8 bottom-8 top-0 flex items-end justify-around">
              {labels.map((label, index) => {
                const stockInHeight = Math.max(stockInValues[index] ? 8 : 1, Math.round((stockInValues[index] / maxValue) * 100))
                const stockOutHeight = Math.max(stockOutValues[index] ? 8 : 1, Math.round((stockOutValues[index] / maxValue) * 100))

                return (
                  <div key={label} className="relative flex h-full w-16 items-end justify-center gap-[2px]">
                    <span className="absolute -bottom-6 whitespace-nowrap text-[10px] font-medium text-ims-slate">{label}</span>
                    <span className="w-3 rounded-t-sm bg-ims-blue transition-all duration-300" style={{ height: `${stockInHeight}%` }} />
                    <span className="w-3 rounded-t-sm bg-ims-success/100 transition-all duration-300" style={{ height: `${stockOutHeight}%` }} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-0 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ims-slate">
            <span className="size-[14px] rounded-full bg-ims-blue" />
            {t.stockIn}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-ims-slate">
            <span className="size-[14px] rounded-full bg-ims-success/100" />
            {t.stockOut}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-3xl border border-ims-slate/20 bg-white p-6">
        <div>
          <h3 className="text-lg font-bold text-ims-navy">{t.operationalMix}</h3>
          <p className="mt-1 text-sm text-ims-slate">{t.currentStockMix}</p>
        </div>
        
        <div className="grid place-items-center">
          <div 
            className="relative grid h-[200px] w-[200px] place-items-center rounded-full" 
            style={{ 
              background: (summary.outOfStock + summary.lowStockItems + Math.max(0, summary.inStock - summary.lowStockItems)) > 0 
                ? `conic-gradient(#B91C1C 0% ${Math.round((summary.outOfStock / (summary.outOfStock + summary.lowStockItems + Math.max(0, summary.inStock - summary.lowStockItems))) * 100)}%, #D97706 ${Math.round((summary.outOfStock / (summary.outOfStock + summary.lowStockItems + Math.max(0, summary.inStock - summary.lowStockItems))) * 100)}% ${Math.round(((summary.outOfStock + summary.lowStockItems) / (summary.outOfStock + summary.lowStockItems + Math.max(0, summary.inStock - summary.lowStockItems))) * 100)}%, #4B5694 ${Math.round(((summary.outOfStock + summary.lowStockItems) / (summary.outOfStock + summary.lowStockItems + Math.max(0, summary.inStock - summary.lowStockItems))) * 100)}% 100%)` 
                : '#f3f4f6' 
            }}
          >
            <div className="grid h-[135px] w-[135px] place-items-center rounded-full bg-white text-center">
              <div>
                <p className="text-[34px] font-black text-ims-navy">
                  {summary.outOfStock + summary.lowStockItems + Math.max(0, summary.inStock - summary.lowStockItems)}
                </p>
                <p className="text-[13px] font-bold text-ims-slate/80">{t.records}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-[#B91C1C]" />
              <span className="font-medium text-ims-slate">{t.outOfStock}</span>
            </div>
            <span className="font-black text-ims-navy">{summary.outOfStock || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-[#D97706]" />
              <span className="font-medium text-ims-slate">{t.lowStock}</span>
            </div>
            <span className="font-black text-ims-navy">{summary.lowStockItems || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-[#4B5694]" />
              <span className="font-medium text-ims-slate">{t.available}</span>
            </div>
            <span className="font-black text-ims-navy">{Math.max(0, summary.inStock - summary.lowStockItems) || 0}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProductQuickFilters({ statusFilter, updateStatus, t }) {
  const hasActiveFilters = Boolean(statusFilter)

  const statusOptions = [
    { key: 'high', label: t.highStock, color: 'bg-ims-success/100' },
    { key: 'good', label: t.goodStock, color: 'bg-ims-success/100' },
    { key: 'low', label: t.lowStock, color: 'bg-ims-warning/100' },
    { key: 'critical', label: t.criticalStock, color: 'bg-ims-danger/100' },
  ]
  const statusCounts = { high: 0, good: 0, low: 0, critical: 0 }

  function clearAll() {
    updateStatus('')
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-ims-slate/20 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-ims-navy">Quick Filters</h3>
        {hasActiveFilters && (
          <button type="button" onClick={clearAll} className="text-xs font-bold text-ims-blue hover:underline">
            {t.clearAll}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ims-slate/80">{t.status}</p>
          {statusOptions.map((option) => (
            <label
              key={option.key}
              className="group flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-ims-cream/25"
            >
              <div className={`size-2 shrink-0 rounded-full ${option.color}`} />
              <div className="flex flex-1 items-center justify-between">
                <span className="text-sm font-medium text-ims-navy transition-colors group-hover:text-ims-blue">
                  {option.label}
                </span>
                <span className="rounded-full bg-ims-cream/40 px-2 py-0.5 text-xs text-ims-slate">
                  {statusCounts[option.key] || 0}
                </span>
              </div>
              <input
                type="checkbox"
                checked={statusFilter === option.key}
                onChange={(e) => updateStatus(e.target.checked ? option.key : '')}
                className="ml-auto rounded border-ims-slate/40 text-ims-blue focus:ring-ims-blue/20"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProductDirectoryLayout({
  items,
  meta,
  page,
  pageSize,
  setPage,
  search,
  updateSearch,
  categories,
  categoryFilter,
  statusFilter,
  updateCategory,
  updateStatus,
  isLoading,
  openCreateDrawer,
  handleDelete,
  editItem,
  t,
  masterColumns,
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
      <div className="xl:col-span-3">
        <div className="flex flex-col overflow-hidden rounded-3xl border border-ims-slate/20 bg-white">
          <div className="flex flex-col gap-4 border-b border-ims-slate/20 p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h3 className="text-lg font-bold text-ims-navy">{t.productDirectory}</h3>
                <p className="text-sm text-ims-slate">{t.productDirectoryDescription}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="flex h-10 items-center gap-2 rounded-full bg-ims-blue px-5 text-sm font-bold text-white transition-colors hover:bg-ims-navy shadow-sm"
                  onClick={openCreateDrawer}
                >
                  <span className="text-lg leading-none">+</span> {t.add} {t.product}
                </button>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ims-slate/60" />
                <input
                  className="h-12 w-full rounded-2xl border-none bg-ims-cream/25 pl-12 pr-4 text-sm font-medium text-ims-navy outline-none placeholder:text-ims-slate/80 focus:ring-2 focus:ring-ims-blue/20"
                  placeholder="Search by name, SKU, or brand..."
                  value={search}
                  onChange={(event) => updateSearch(event.target.value)}
                />
              </div>

              <div className="relative shrink-0 sm:w-[240px]">
                <Select
                  value={categoryFilter}
                  onChange={(event) => updateCategory(event.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            {isLoading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : (
              <table className="w-full min-w-[800px]">
                <thead className="bg-ims-cream/25">
                  <tr>
                    <th className="w-[30%] px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-ims-slate/80">Product Info</th>
                    <th className="w-[15%] px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-ims-slate/80">SKU</th>
                    <th className="w-[15%] px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-ims-slate/80">{t.category}</th>
                    <th className="w-[15%] px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-ims-slate/80">Price</th>
                    <th className="w-[15%] px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-ims-slate/80">Minimum Stock</th>
                    <th className="w-[10%] px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-ims-slate/80">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ims-slate/10">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-ims-slate/80">
                        No products found.
                      </td>
                    </tr>
                  ) : null}
                  {items.map((item) => {
                    const stock = productStockMeter(item)

                    return (
                      <tr key={item.id} className="group transition-colors hover:bg-ims-cream/25/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ims-cream/40 text-ims-slate/80">
                              <Boxes className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ims-navy">{item.name ?? '-'}</p>
                              <p className="truncate text-xs text-ims-slate/80">{item.barcode ?? '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-ims-slate/80">{item.sku ?? '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-ims-slate">
                            {item.category?.name ?? '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-ims-navy">{item.unit_record?.symbol ?? item.unit ?? '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-ims-navy">{stock.current.toLocaleString('en-US')}</span>
                              <span className="text-ims-slate/80">Min: {stock.minimum.toLocaleString('en-US')}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ims-cream/40">
                              <div className={`${stock.tone} h-full rounded-full transition-all duration-300`} style={{ width: `${stock.ratio}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <RowActions align="end" item={item} onDelete={handleDelete} onEdit={editItem} t={t} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="space-y-2 p-3 lg:hidden">
            {isLoading ? (
              <CardSkeleton count={4} />
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-ims-slate/20 bg-white p-4 text-center">
                <p className="text-xs text-ims-slate/80">{t.noDataActiveFilters}</p>
              </div>
            ) : null}
            {!isLoading && items.map((item) => (
              <MobileCard key={item.id} activeTab="products" item={item} onDelete={handleDelete} onEdit={editItem} t={t} masterColumns={masterColumns} />
            ))}
          </div>

          <div className="hidden lg:block">
            <DesktopPagination meta={meta} page={page} pageSize={pageSize} setPage={setPage} t={t} />
          </div>
        </div>
        <MobilePagination meta={meta} page={page} pageSize={pageSize} setPage={setPage} t={t} />
      </div>

      <div className="xl:col-span-1">
        <ProductQuickFilters
          statusFilter={statusFilter}
          updateStatus={updateStatus}
          t={t}
        />
      </div>
    </div>
  )
}

function MasterData() {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [form, setForm] = useState(emptyForms.products)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const api = useMemo(() => ({
    products: productsApi,
    categories: categoriesApi,
    units: unitsApi,
    warehouses: warehousesApi,
    contacts: contactsApi,
  }), [])

  const tabs = getTabs(t)
  const requestedTab = searchParams.get('tab') ?? 'products'
  const activeTab = tabs.some((tab) => tab.key === requestedTab) ? requestedTab : 'products'
  const masterColumns = getMasterColumns(t)
  const activeConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0]
  const columns = masterColumns[activeTab]
  const pageSize = 10
  const masterSummary = useMemo(
    () => summarizeMaster(activeTab, items, meta, t),
    [activeTab, items, meta, t],
  )
  const productSummary = useMemo(
    () => productCatalogSummary(items, meta),
    [items, meta],
  )
  const barLabels = masterSummary.groupEntries.map(([label]) => label)
  const barValues = masterSummary.groupEntries.map(([, value]) => value)
  const donutItems = activeTab === 'products' || activeTab === 'warehouses'
    ? [
      {
        label: t.activeRowsShort,
        value: masterSummary.activeRows,
        color: '#047857',
        displayValue: masterSummary.activeRows.toLocaleString('en-US'),
      },
      {
        label: t.inactiveRowsShort,
        value: masterSummary.inactiveRows,
        color: '#B91C1C',
        displayValue: masterSummary.inactiveRows.toLocaleString('en-US'),
      },
    ]
    : masterSummary.groupEntries.slice(0, 4).map(([label, value], index) => ({
      label,
      value,
      color: ['#4B5694', '#7288AE', '#111844', '#D97706'][index] ?? '#4B5694',
      displayValue: value.toLocaleString('en-US'),
    }))
  useEffect(() => {
    let ignore = false

    async function loadOptions() {
      try {
        const [categoryResponse, unitResponse] = await Promise.all([
          categoriesApi.list({ per_page: 100 }),
          unitsApi.list({ per_page: 100 }),
        ])

        if (!ignore) {
          setCategories(normalizeList(categoryResponse).items)
          setUnits(normalizeList(unitResponse).items)
        }
      } catch {
        if (!ignore) {
          setCategories([])
          setUnits([])
        }
      }
    }

    loadOptions()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadItems() {
      setIsLoading(true)
      setError('')

      try {
        const params = {
          page,
          per_page: pageSize,
          search: search || undefined,
        }

        if (activeTab === 'products') {
          params.category_id = categoryFilter || undefined
          params.status = statusFilter || undefined
        }

        const response = await api[activeTab].list(params)
        const list = normalizeList(response)

        if (!ignore) {
          setItems(list.items)
          setMeta(list.meta)
        }
      } catch (error) {
        if (!ignore) {
          setError(apiErrorMessage(error, 'Data master belum dapat dimuat.'))
        }
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    const timer = setTimeout(loadItems, 250)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [activeTab, api, categoryFilter, page, search, statusFilter])

  function resetForm() {
    setForm(emptyForms[activeTab])
    setEditing(null)
  }

  function setField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function updateSearch(value) {
    setSearch(value)
    setPage(1)
  }

  function updateCategory(value) {
    setCategoryFilter(value)
    setPage(1)
  }

  function updateStatus(value) {
    setStatusFilter(value)
    setPage(1)
  }

  function openCreateDrawer() {
    resetForm()
    setIsDrawerOpen(true)
  }

  function editItem(item) {
    setEditing(item)
    setIsDrawerOpen(true)

    if (activeTab === 'products') {
      setForm({
        category_id: String(item.category_id ?? ''),
        unit_id: String(item.unit_id ?? ''),
        sku: item.sku ?? '',
        barcode: item.barcode ?? '',
        name: item.name ?? '',
        minimum_stock: item.minimum_stock ?? 0,
        cost_method: item.cost_method ?? (item.valuation_method === 'fifo' ? 'FIFO' : 'AVERAGE'),
        status: Boolean(item.status ?? true),
      })
    } else if (activeTab === 'warehouses') {
      setForm({
        code: item.code ?? '',
        name: item.name ?? '',
        address: item.address ?? '',
        manager_name: item.manager_name ?? '',
        status: Boolean(item.status ?? true),
      })
    } else if (activeTab === 'categories') {
      setForm({
        name: item.name ?? '',
        description: item.description ?? '',
      })
    } else if (activeTab === 'contacts') {
      setForm({
        name: item.name ?? '',
        type: item.type ?? 'SUPPLIER',
        email: item.email ?? '',
        phone: item.phone ?? '',
        address: item.address ?? '',
        status: Boolean(item.status ?? true),
      })
    } else {
      setForm({
        name: item.name ?? '',
        symbol: item.symbol ?? '',
      })
    }
  }

  function productPayload() {
    const selectedUnit = units.find((unit) => String(unit.id) === String(form.unit_id))

    return {
      ...form,
      category_id: Number(form.category_id),
      unit_id: Number(form.unit_id),
      minimum_stock: Number(form.minimum_stock),
      status: Boolean(form.status),
      valuation_method: form.cost_method === 'FIFO' ? 'fifo' : 'average',
      unit: selectedUnit?.symbol?.toLowerCase() ?? 'pcs',
    }
  }

  async function reloadCurrentList(nextPage = page) {
    const params = {
      page: nextPage,
      per_page: pageSize,
      search: search || undefined,
    }

    if (activeTab === 'products') {
      params.category_id = categoryFilter || undefined
      params.status = statusFilter || undefined
    }

    const response = await api[activeTab].list(params)
    const list = normalizeList(response)
    setItems(list.items)
    setMeta(list.meta)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = activeTab === 'products'
        ? productPayload()
        : {
          ...form,
          status: form.status === undefined ? undefined : Boolean(form.status),
        }

      if (editing) {
        await api[activeTab].update(editing.id, payload)
        setMessage(t.dataUpdated)
      } else {
        await api[activeTab].create(payload)
        setMessage(t.dataCreated)
      }

      setIsDrawerOpen(false)
      resetForm()
      await reloadCurrentList()
    } catch (error) {
      setError(apiErrorMessage(error, t.dataSaveFailed))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(item) {
    setError('')
    setMessage('')

    try {
      await api[activeTab].remove(item.id)
      setItems((current) => current.filter((row) => row.id !== item.id))
      setMeta((current) => ({ ...current, total: Math.max(0, current.total - 1) }))
      setMessage(t.dataDeleted)
      if (editing?.id === item.id) resetForm()
    } catch (error) {
      setError(apiErrorMessage(error, t.dataDeleteFailed))
    }
  }

  async function handleProductImport(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const payload = new FormData()
    payload.append('file', file)
    setError('')
    setMessage('')

    try {
      const response = await productsApi.import(payload)
      setMessage(`Import selesai. Created: ${response.data.data.created}, updated: ${response.data.data.updated}.`)
      setPage(1)
      await reloadCurrentList(1)
    } catch (error) {
      setError(apiErrorMessage(error, 'Import produk gagal. Periksa format CSV.'))
    } finally {
      event.target.value = ''
    }
  }

  async function handleProductExport() {
    setError('')

    try {
      const response = await productsApi.export({ category_id: categoryFilter || undefined })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'products-export.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setError(apiErrorMessage(error, 'Export produk gagal.'))
    }
  }

  return (
    <div className="space-y-7">
      {activeTab === 'products' ? (
        <>
          <ProductCatalogStats summary={productSummary} t={t} />
          <ProductInventoryCharts items={items} summary={productSummary} t={t} />
        </>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={activeConfig.icon}
              label={`${t.total} ${activeConfig.label}`}
              value={masterSummary.total.toLocaleString('en-US')}
              helper={activeTab === 'contacts' ? t.contactMasterDescription : t.records}
              tone="blue"
            />
            <MetricCard
              icon={CircleCheck}
              label={activeTab === 'warehouses' ? t.activeRowsShort : t.products}
              value={(activeTab === 'warehouses'
                ? masterSummary.activeRows
                : masterSummary.linkedProducts
              ).toLocaleString('en-US')}
              helper={activeTab === 'warehouses' ? t.status : t.productMaster}
              tone="success"
            />
            <MetricCard
              icon={BarChart3}
              label={t.categories}
              value={masterSummary.groupEntries.length.toLocaleString('en-US')}
              helper={t.records}
              tone="warning"
            />
            <MetricCard
              icon={PackagePlus}
              label={t.action}
              value={activeTab === 'contacts' ? masterSummary.total.toLocaleString('en-US') : '+1'}
              helper={activeTab === 'contacts' ? t.contactMaster : `${t.add} ${activeConfig.singleLabel}`}
              tone="navy"
            />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <BarTrendPanel
                title={`${activeConfig.title} Trend`}
                subtitle="Distribusi data berdasarkan daftar aktif"
                labels={barLabels}
                emptyText={isLoading ? t.loading : t.noDataActiveFilters}
                series={[
                  { label: activeConfig.label, values: barValues, className: 'bg-ims-blue' },
                ]}
              />
            </div>
            <DonutPanel
              title={`${activeConfig.label} Mix`}
              subtitle={activeTab === 'warehouses' ? t.status : t.records}
              centerLabel={activeConfig.label}
              centerValue={masterSummary.total.toLocaleString('en-US')}
              emptyText={isLoading ? t.loading : t.noDataActiveFilters}
              items={donutItems}
            />
          </section>

        </>
      )}

      {activeTab === 'products' ? (
        <ProductDirectoryLayout
          items={items}
          meta={meta}
          page={page}
          pageSize={pageSize}
          setPage={setPage}
          search={search}
          updateSearch={updateSearch}
          categories={categories}
          categoryFilter={categoryFilter}
          statusFilter={statusFilter}
          updateCategory={updateCategory}
          updateStatus={updateStatus}
          isLoading={isLoading}
          openCreateDrawer={openCreateDrawer}
          handleDelete={handleDelete}
          editItem={editItem}
          t={t}
          masterColumns={masterColumns}
        />
      ) : null}

      {activeTab !== 'products' ? (
        <>

      {/* ── Toolbar — semua dalam 1 baris ───────────────── */}
      <section className="overflow-hidden rounded-3xl border border-ims-slate/20 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-ims-slate/10 p-4 lg:flex-nowrap">

        {/* Search */}
        <div className="relative w-full shrink-0 sm:w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ims-slate/60" size={14} />
          <Input
            className="h-10 border-ims-slate/20 bg-white pl-9 text-[13px]"
            placeholder={`${t.search} ${activeConfig.label.toLowerCase()}...`}
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
          />
        </div>

        {/* Filters — hanya untuk tab produk */}
        {activeTab === 'products' ? (
          <>
            <Select className="w-full shrink-0 text-[13px] sm:w-[180px]" value={categoryFilter} onChange={(event) => updateCategory(event.target.value)}>
              <option value="">{t.allCategories}</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
            <Select className="w-full shrink-0 text-[13px] sm:w-[160px]" value={statusFilter} onChange={(event) => updateStatus(event.target.value)}>
              <option value="">{t.allStatuses}</option>
              <option value="1">{t.activeRowsShort}</option>
              <option value="0">{t.inactiveRowsShort}</option>
            </Select>
          </>
        ) : null}

        {/* Spacer — mendorong action buttons ke kanan */}
        <div className="hidden flex-1 lg:block" />

        {/* Divider visual */}
        {activeTab === 'products' ? (
          <div className="hidden h-6 w-px bg-ims-slate/15 lg:block" />
        ) : null}

        {/* Action buttons — export, import, tambah — satu baris */}
        {activeTab === 'products' ? (
          <>
            <Button
              size="sm"
              type="button"
              variant="outline"
              className="h-10 shrink-0 border-ims-slate/20 bg-white px-3 text-[13px] font-semibold text-ims-slate/80 hover:bg-ims-cream/35"
              onClick={handleProductExport}
            >
              <Download size={14} className="text-ims-slate/60" />
              <span className="hidden sm:inline">{t.export} CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-ims-slate/20 bg-white px-3 text-[13px] font-semibold text-ims-slate/80 transition-colors hover:bg-ims-cream/35">
              <Upload size={14} className="text-ims-slate/60" />
              <span className="hidden sm:inline">{t.import} CSV</span>
              <span className="sm:hidden">Import</span>
              <input className="hidden" type="file" accept=".csv,text/csv" onChange={handleProductImport} />
            </label>
          </>
        ) : null}

        <Button
          size="sm"
          type="button"
          className="h-10 shrink-0 px-4 text-[13px] font-semibold"
          onClick={openCreateDrawer}
        >
          <PackagePlus size={14} />
          {t.add} {activeConfig.singleLabel}
        </Button>
      </div>

      {/* ── Alerts ──────────────────────────────────────── */}
      {error ? (
        <p className="mx-4 mt-4 rounded-lg border border-ims-danger/20 bg-ims-danger/10 p-3 text-xs text-ims-danger">{error}</p>
      ) : null}
      {message ? (
        <p className="mx-4 mt-4 rounded-lg border border-ims-success/20 bg-ims-success/10 p-3 text-xs text-ims-success">{message}</p>
      ) : null}

      {activeTab === 'contacts' ? (
        <div className="m-4 rounded-3xl border border-ims-slate/20 bg-ims-cream/25 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ims-blue/10 text-ims-blue">
              <UsersRound size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-ims-navy">{t.contactMaster}</h3>
              <p className="mt-1 text-xs leading-5 text-ims-slate">{t.contactMasterDescription}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Desktop Table ────────────────────────────────── */}
      <div className="hidden overflow-x-auto lg:block">
        {isLoading ? (
          <TableSkeleton rows={8} cols={columns.length + 1} />
        ) : (
          <div className="flex flex-col">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="ims-table-head border-b border-ims-slate/20">
                <tr>
                  {columns.map(([key, label]) => {
                    let widthClass = ''
                    if (['sku', 'code', 'symbol', 'unit'].includes(key)) widthClass = 'w-[110px]'
                    if (['status', 'minimum_stock'].includes(key)) widthClass = 'w-[120px]'
                    return (
                      <th
                        key={key}
                        className={`px-6 py-3 text-left ${widthClass}`}
                      >
                        {label}
                      </th>
                    )
                  })}
                  <th className={`px-6 py-3 w-[100px] ${activeTab === 'products' ? 'text-center' : 'text-right'}`}>
                    {t.action}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ims-slate/10">
                {items.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm text-ims-slate" colSpan={columns.length + 1}>
                      {t.noDataActiveFilters}
                    </td>
                  </tr>
                ) : null}
                {items.map((item) => (
                  <tr key={item.id} className="group bg-white transition-colors even:bg-ims-cream/20 hover:bg-ims-cream/30">
                    {columns.map(([key]) => (
                      <td key={key} className="px-6 py-3">
                        {renderTableValue(activeTab, item, key, t)}
                      </td>
                    ))}
                    <td className={`px-6 py-3 ${activeTab === 'products' ? 'text-center' : ''}`}>
                      <RowActions align={activeTab === 'products' ? 'center' : 'end'} item={item} onDelete={handleDelete} onEdit={editItem} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <DesktopPagination meta={meta} page={page} pageSize={pageSize} setPage={setPage} t={t} />
          </div>
        )}
      </div>

      {/* ── Mobile Cards ─────────────────────────────────── */}
      <div className="space-y-2 p-4 lg:hidden">
        {isLoading ? (
          <CardSkeleton count={4} />
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-ims-slate/20 bg-white p-4 text-center">
            <p className="text-xs text-ims-slate">{t.noDataActiveFilters}</p>
          </div>
        ) : null}
        {!isLoading && items.map((item) => (
          <MobileCard key={item.id} activeTab={activeTab} item={item} onDelete={handleDelete} onEdit={editItem} t={t} masterColumns={masterColumns} />
        ))}
      </div>

      <MobilePagination meta={meta} page={page} pageSize={pageSize} setPage={setPage} t={t} />
      </section>
        </>
      ) : null}

      <Drawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          setIsDrawerOpen(open)
          if (!open) resetForm()
        }}
        title={editing ? `${t.edit} ${activeConfig.singleLabel}` : `${t.add} ${activeConfig.singleLabel}`}
        description={`${activeConfig.label} ${t.formDetails}`}
      >
        <form id="master-form" className="space-y-4" onSubmit={handleSubmit}>
          {renderForm(activeTab, form, setField, categories, units, t)}
        </form>
        <DrawerFooter className="mt-8">
          <Button type="button" variant="outline" onClick={() => setIsDrawerOpen(false)}>{t.cancel}</Button>
          <Button type="submit" form="master-form" disabled={isSaving} className="bg-ims-blue text-white hover:bg-ims-navy">
            {editing ? <Pencil size={16} /> : <PackagePlus size={16} />}
            {isSaving ? t.saving : editing ? `${t.update} Data` : `${t.save} Data`}
          </Button>
        </DrawerFooter>
      </Drawer>
    </div>
  )
}

function renderForm(activeTab, form, setField, categories, units, t) {
  if (activeTab === 'products') {
    return (
      <>
        <Field label={t.productName}><Input required value={form.name} onChange={(event) => setField('name', event.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="SKU"><Input required value={form.sku} onChange={(event) => setField('sku', event.target.value)} /></Field>
          <Field label={t.barcode}><Input value={form.barcode ?? ''} onChange={(event) => setField('barcode', event.target.value)} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.category}>
            <Select required value={form.category_id} onChange={(event) => setField('category_id', event.target.value)}>
              <option value="">{t.selectCategory}</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </Field>
          <Field label={t.unit}>
            <Select required value={form.unit_id} onChange={(event) => setField('unit_id', event.target.value)}>
              <option value="">{t.selectUnit}</option>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.symbol} - {unit.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t.minimumStock}><Input min="0" required type="number" value={form.minimum_stock} onChange={(event) => setField('minimum_stock', event.target.value)} /></Field>
          <Field label={t.costMethod}>
            <Select value={form.cost_method} onChange={(event) => setField('cost_method', event.target.value)}>
              <option value="AVERAGE">AVERAGE</option>
              <option value="FIFO">FIFO</option>
            </Select>
          </Field>
          <Field label={t.status}>
            <Select value={form.status ? '1' : '0'} onChange={(event) => setField('status', event.target.value === '1')}>
              <option value="1">{t.activeRowsShort}</option>
              <option value="0">{t.inactiveRowsShort}</option>
            </Select>
          </Field>
        </div>
      </>
    )
  }

  if (activeTab === 'warehouses') {
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.code}><Input required value={form.code} onChange={(event) => setField('code', event.target.value)} /></Field>
          <Field label={t.name}><Input required value={form.name} onChange={(event) => setField('name', event.target.value)} /></Field>
        </div>
        <Field label={t.address}><Input value={form.address ?? ''} onChange={(event) => setField('address', event.target.value)} /></Field>
        <Field label={t.manager}><Input value={form.manager_name ?? ''} onChange={(event) => setField('manager_name', event.target.value)} /></Field>
        <Field label={t.status}>
          <Select value={form.status ? '1' : '0'} onChange={(event) => setField('status', event.target.value === '1')}>
            <option value="1">{t.activeRowsShort}</option>
            <option value="0">{t.inactiveRowsShort}</option>
          </Select>
        </Field>
      </>
    )
  }

  if (activeTab === 'categories') {
    return (
      <>
        <Field label={t.name}><Input required value={form.name} onChange={(event) => setField('name', event.target.value)} /></Field>
        <Field label={t.description}><Input value={form.description ?? ''} onChange={(event) => setField('description', event.target.value)} /></Field>
      </>
    )
  }

  if (activeTab === 'contacts') {
    return (
      <>
        <Field label={t.name}><Input required value={form.name} onChange={(event) => setField('name', event.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.type}>
            <Select required value={form.type} onChange={(event) => setField('type', event.target.value)}>
              <option value="SUPPLIER">Supplier</option>
              <option value="CUSTOMER">Customer</option>
            </Select>
          </Field>
          <Field label={t.status}>
            <Select value={form.status ? '1' : '0'} onChange={(event) => setField('status', event.target.value === '1')}>
              <option value="1">{t.activeRowsShort}</option>
              <option value="0">{t.inactiveRowsShort}</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.email}><Input type="email" value={form.email ?? ''} onChange={(event) => setField('email', event.target.value)} /></Field>
          <Field label={t.phone}><Input type="tel" value={form.phone ?? ''} onChange={(event) => setField('phone', event.target.value)} /></Field>
        </div>
        <Field label={t.address}><Input value={form.address ?? ''} onChange={(event) => setField('address', event.target.value)} /></Field>
      </>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      <Field label={t.name}><Input required value={form.name} onChange={(event) => setField('name', event.target.value)} /></Field>
      <Field label={t.symbol}><Input required value={form.symbol} onChange={(event) => setField('symbol', event.target.value.toUpperCase())} /></Field>
    </div>
  )
}

function renderTableValue(activeTab, item, key, t) {
  if (key === 'status') return <StatusBadge active={item.status} t={t} />

  const value = getCellValue(activeTab, item, key)
  const baseClass = 'text-[13px] font-medium text-ims-navy'

  if (['sku'].includes(key)) {
    return <span className="inline-flex items-center rounded-lg bg-ims-cream/40 px-2 py-1 font-mono text-[11px] font-semibold text-ims-slate">{value}</span>
  }

  if (['code', 'symbol'].includes(key)) {
    return <span className="font-mono text-[13px] font-bold text-ims-navy">{value}</span>
  }

  if (['minimum_stock'].includes(key)) {
    const num = parseFloat(value)
    const displayValue = !isNaN(num) && Number.isInteger(num) ? num.toString() : value
    return <span className="text-[13px] font-medium text-ims-slate">{displayValue}</span>
  }

  if (['products_count', 'manager_name'].includes(key)) {
    return <span className="text-[13px] font-medium text-ims-slate">{value}</span>
  }

  if (['name'].includes(key)) {
    return (
      <div className="flex flex-col">
        <span className="text-[13px] font-bold text-ims-navy">{value}</span>
        {activeTab === 'products' && item.barcode && (
          <span className="mt-0.5 text-[11px] font-medium text-ims-slate">{item.barcode}</span>
        )}
      </div>
    )
  }

  return <span className={baseClass}>{value}</span>
}

function getCellValue(activeTab, item, key) {
  if (activeTab === 'products') {
    if (key === 'category') return item.category?.name ?? '-'
    if (key === 'unit') return item.unit_record?.symbol ?? item.unit ?? '-'
  }

  const value = item[key]
  if (typeof value === 'number') return value.toLocaleString('en-US')
  if (value === null || value === undefined || value === '') return '-'
  return value
}

function MobileCard({ activeTab, item, onEdit, onDelete, t, masterColumns }) {
  const title = item.name ?? item.sku ?? item.code ?? item.symbol
  const subtitle = activeTab === 'products'
    ? item.sku
    : activeTab === 'warehouses'
      ? item.code
      : item.symbol ?? `${item.products_count ?? 0} products`
  const details = masterColumns[activeTab].slice(1, 5)

  return (
    <article className="rounded-3xl border border-ims-slate/20 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-ims-navy">{title}</p>
          <p className="mt-0.5 text-[11px] text-ims-slate">{subtitle}</p>
        </div>
        {activeTab === 'products' || activeTab === 'warehouses' ? <StatusBadge active={item.status} t={t} /> : null}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {details.map(([key, label]) => (
          <div key={key} className="rounded-md bg-ims-cream/40 p-2">
            <p className="text-[9px] font-black uppercase tracking-wide text-ims-slate">{label}</p>
            <p className="mt-0.5 text-xs font-bold text-ims-navy">{key === 'status' ? (item.status === false ? t.inactiveRowsShort : t.activeRowsShort) : getCellValue(activeTab, item, key)}</p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <RowActions item={item} onDelete={onDelete} onEdit={onEdit} t={t} />
      </div>
    </article>
  )
}

function DesktopPagination({ meta, page, pageSize, setPage, t }) {
  const start = meta.total === 0 ? 0 : ((page - 1) * pageSize) + 1
  const end = Math.min(page * pageSize, meta.total)

  return (
    <div className="flex items-center justify-between border-t border-ims-slate/10 bg-white px-6 py-4">
      <div className="text-xs font-medium text-ims-slate">
        {t.showing} {start}-{end} {t.of} {meta.total.toLocaleString('en-US')} {t.records}
      </div>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-ims-slate/20 text-ims-slate/80 transition-colors hover:bg-ims-cream/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-[10px]">{'<'}</span>
        </button>
        <button
          disabled={page >= meta.last_page}
          onClick={() => setPage((value) => value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-ims-slate/20 text-ims-slate/80 transition-colors hover:bg-ims-cream/25 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="text-[12px] text-ims-slate/80">
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

function Field({ children, label }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function StatusBadge({ active, t }) {
  const isInactive = active === false || active === 0 || active === '0'

  return (
    <Badge
      variant="outline"
      className={[
        'rounded-[4px] border-none px-2.5 py-1 text-[10px] font-extrabold tracking-wider shadow-none',
        isInactive ? 'bg-ims-danger/10 text-ims-danger' : 'bg-ims-success/10 text-ims-success',
      ].join(' ')}
    >
      {isInactive ? t.inactiveRowsShort : t.activeRowsShort}
    </Badge>
  )
}

function RowActions({ align = 'end', item, onDelete, onEdit, t }) {
  return (
    <div className={`flex gap-2 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100 ${align === 'center' ? 'justify-center' : 'justify-end'}`}>
      <button
        type="button"
        onClick={() => onEdit(item)}
        className="flex size-8 items-center justify-center rounded-lg text-ims-slate/80 transition-colors hover:bg-ims-cream/40 hover:text-ims-blue"
        title={t.edit}
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(item)}
        className="flex size-8 items-center justify-center rounded-lg text-ims-slate/80 transition-colors hover:bg-ims-danger/10 hover:text-ims-danger"
        title={t.delete || 'Delete'}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

export default MasterData
