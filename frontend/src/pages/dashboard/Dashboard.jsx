import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Building2, ClipboardList, PackageCheck, AlertCircle, ArrowRightLeft } from 'lucide-react'
import { dashboardApi } from '@/api/dashboard'
import { BarTrendPanel, DonutPanel, ChartFilter } from '@/components/analytics/OperationalCharts'
import { KpiSkeleton, ListSkeleton, TableSkeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'
import { trendLabels, monthlyLabels, movementBucketIndex } from '@/utils/chartHelpers'

function movementTitle(type, t) {
  return {
    IN: t.stockIn,
    OUT: t.stockOut,
    TRANSFER: t.transfer,
    ADJUSTMENT: t.adjustment,
  }[type] ?? t.stockMovement
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('en-US')
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

const emptySummary = {
  metrics: {
    total_sku: 0,
    total_stock: 0,
    total_warehouses: 0,
    inventory_value: 0,
    low_stock_count: 0,
    pending_transfers: 0,
  },
  low_stocks: [],
  pending_transfers: [],
  inventory_snapshot: [],
  recent_activities: [],
}

const emptyArray = []

function Dashboard() {
  const { t } = useLanguage()
  const [summary, setSummary] = useState(emptySummary)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    async function loadDashboard() {
      setIsLoading(true)
      setError('')
      try {
        const response = await dashboardApi.summary()
        if (!ignore) {
          setSummary(response.data.data ?? emptySummary)
        }
      } catch (error) {
        if (!ignore) {
          setError(apiErrorMessage(error, 'Dashboard belum dapat terhubung ke API Laravel.'))
        }
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }
    loadDashboard()
    return () => { ignore = true }
  }, [])

  const metrics = summary.metrics ?? emptySummary.metrics
  const lowStocks = summary.low_stocks ?? emptyArray
  const movements = summary.recent_activities ?? emptyArray
  const [period, setPeriod] = useState('weekly')
  const isWeekly = period === 'weekly'

  const labels = isWeekly ? trendLabels : monthlyLabels

  const movementTrend = useMemo(() => {
    const length = isWeekly ? 7 : 4
    const stockIn = Array.from({ length }, () => 0)
    const stockOut = Array.from({ length }, () => 0)
    const transfers = Array.from({ length }, () => 0)

    movements.forEach((activity) => {
      const index = movementBucketIndex(activity.created_at, isWeekly)

      if (index < 0) return
      const qty = Number(activity.quantity ?? 0)
      if (activity.type === 'IN') stockIn[index] += qty
      else if (activity.type === 'OUT') stockOut[index] += qty
      else transfers[index] += qty
    })

    return { stockIn, stockOut, transfers }
  }, [movements, isWeekly])

  const operationsDistribution = useMemo(() => ([
    {
      label: t.lowStock,
      value: Number(metrics.low_stock_count ?? 0),
      color: '#B91C1C',
      displayValue: formatNumber(metrics.low_stock_count),
    },
    {
      label: t.pendingTransfer,
      value: Number(metrics.pending_transfers ?? 0),
      color: '#D97706',
      displayValue: formatNumber(metrics.pending_transfers),
    },
    {
      label: t.warehouses,
      value: Number(metrics.total_warehouses ?? 0),
      color: '#4B5694',
      displayValue: formatNumber(metrics.total_warehouses),
    },
  ]), [metrics, t])

  return (
    <div className="space-y-6">

      {error ? (
        <div className="rounded-[10px] border border-ims-danger/20 bg-ims-danger/5 p-3 text-sm text-ims-danger">
          {error}
        </div>
      ) : null}

      {/* KPI Cards Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Low Stock */}
        <div className="flex flex-col gap-3 rounded-3xl border border-ims-slate/20 bg-white p-6 transition-shadow hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ims-danger/10 text-ims-danger">
              <AlertCircle size={24} />
            </div>
            <span className="rounded-full bg-ims-danger/10 px-2 py-1 text-xs font-bold text-ims-danger">{t.alert}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-ims-slate">{t.lowStock}</p>
            <p className="text-[32px] font-black leading-10 text-ims-navy">
              {isLoading ? <KpiSkeleton className="h-8 w-12" /> : metrics.low_stock_count}
            </p>
            <p className="text-[10px] font-semibold text-ims-slate">{t.items}</p>
          </div>
        </div>

        {/* Card 2: Pending Transfer */}
        <div className="flex flex-col gap-3 rounded-3xl border border-ims-slate/20 bg-white p-6 transition-shadow hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ims-warning/10 text-ims-warning">
              <ArrowRightLeft size={24} />
            </div>
            <span className="rounded-full bg-ims-warning/10 px-2 py-1 text-xs font-bold text-ims-warning">{t.transfer}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-ims-slate">{t.pendingTransfer}</p>
            <p className="text-[32px] font-black leading-10 text-ims-navy">
              {isLoading ? <KpiSkeleton className="h-8 w-12" /> : metrics.pending_transfers}
            </p>
            <p className="text-[10px] font-semibold text-ims-slate">{t.transfers}</p>
          </div>
        </div>

        {/* Card 3: Total SKU */}
        <div className="flex flex-col gap-3 rounded-3xl border border-ims-slate/20 bg-white p-6 transition-shadow hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ims-blue/10 text-ims-blue">
              <PackageCheck size={24} />
            </div>
            <span className="rounded-full bg-ims-blue/10 px-2 py-1 text-xs font-bold text-ims-blue">SKU</span>
          </div>
          <div>
            <p className="text-sm font-medium text-ims-slate">{t.totalSku}</p>
            <p className="text-[32px] font-black leading-10 text-ims-navy">
              {isLoading ? <KpiSkeleton className="h-8 w-12" /> : formatNumber(metrics.total_sku)}
            </p>
            <p className="text-[10px] font-semibold text-ims-slate">SKU</p>
          </div>
        </div>

        {/* Card 4: Total Inventory */}
        <div className="flex flex-col gap-3 rounded-3xl border border-ims-slate/20 bg-white p-6 transition-shadow hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ims-blue/10 text-ims-blue">
              <Archive size={24} />
            </div>
            <span className="rounded-full bg-ims-blue/10 px-2 py-1 text-xs font-bold text-ims-blue">{t.stock}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-ims-slate">{t.totalInventory}</p>
            <p className="text-[32px] font-black leading-10 text-ims-navy">
              {isLoading ? <KpiSkeleton className="h-8 w-16" /> : formatNumber(metrics.total_stock)}
            </p>
            <p className="text-[10px] font-semibold text-ims-slate">{t.unitsCount}</p>
          </div>
        </div>

        {/* Card 5: Inventory Value */}
        <div className="flex flex-col gap-3 rounded-3xl border border-ims-slate/20 bg-white p-6 transition-shadow hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ims-success/10 text-ims-success">
              <ClipboardList size={24} />
            </div>
            <span className="rounded-full bg-ims-success/10 px-2 py-1 text-xs font-bold text-ims-success">{t.value}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-ims-slate">{t.inventoryValue}</p>
            <p className="text-[32px] font-black leading-10 text-ims-navy">
              {isLoading ? <KpiSkeleton className="h-8 w-32" /> : formatCurrency(metrics.inventory_value)}
            </p>
          </div>
        </div>

        {/* Card 6: Warehouses */}
        <div className="flex flex-col gap-3 rounded-3xl border border-ims-slate/20 bg-white p-6 transition-shadow hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ims-blue/10 text-ims-blue">
              <Building2 size={24} />
            </div>
            <span className="rounded-full bg-ims-blue/10 px-2 py-1 text-xs font-bold text-ims-blue">{t.locations}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-ims-slate">{t.warehouses}</p>
            <p className="text-[32px] font-black leading-10 text-ims-navy">
              {isLoading ? <KpiSkeleton className="h-8 w-8" /> : formatNumber(metrics.total_warehouses)}
            </p>
            <p className="text-[10px] font-semibold text-ims-slate">{t.locations}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BarTrendPanel
            title="Stock Movement"
            subtitle="Inbound, outbound, dan transfer dari aktivitas terbaru"
            labels={labels}
            emptyText={isLoading ? t.loading : t.noActivities}
            action={<ChartFilter period={period} onChange={setPeriod} />}
            series={[
              { label: t.stockIn, values: movementTrend.stockIn, className: 'bg-ims-blue' },
              { label: t.stockOut, values: movementTrend.stockOut, className: 'bg-ims-danger' },
              { label: t.transfer, values: movementTrend.transfers, className: 'bg-ims-warning' },
            ]}
          />
        </div>
        <DonutPanel
          title="Operational Mix"
          subtitle="Komposisi alert dashboard saat ini"
          centerLabel={t.records}
          centerValue={formatNumber(
            Number(metrics.low_stock_count ?? 0) +
            Number(metrics.pending_transfers ?? 0) +
            Number(metrics.total_warehouses ?? 0),
          )}
          emptyText={isLoading ? t.loading : t.noDataActiveFilters}
          items={operationsDistribution}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Section 3: Low Stock Table */}
        <section className="min-w-0">
          <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-ims-slate/20 bg-white">
            <div className="flex items-center justify-between border-b border-ims-slate/10 p-5">
              <h3 className="text-base font-bold text-ims-navy">{t.lowStockItems}</h3>
              <Link to="/inventory" className="text-sm font-semibold text-ims-blue hover:underline">{t.viewAll}</Link>
            </div>

            {isLoading ? (
              <div className="p-5"><TableSkeleton rows={5} cols={5} /></div>
            ) : lowStocks.length === 0 ? (
              <div className="p-6 text-center text-sm text-ims-slate">{t.noLowStockData}</div>
            ) : (
              <>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="ims-table-head">
                      <tr>
                        <th className="px-5 py-4 font-semibold">SKU</th>
                        <th className="px-5 py-4 font-semibold">{t.product}</th>
                        <th className="px-5 py-4 font-semibold">{t.warehouse}</th>
                        <th className="px-5 py-4 font-semibold">{t.currentStock} / {t.minStock}</th>
                        <th className="px-5 py-4 font-semibold">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ims-slate/10">
                      {lowStocks.map((item) => (
                        <tr key={item.id} className="transition-colors hover:bg-ims-cream/30">
                          <td className="px-5 py-4 font-mono text-xs font-bold text-ims-navy">{item.product?.sku}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-ims-navy">{item.product?.name}</td>
                          <td className="px-5 py-4 text-sm text-ims-slate">{item.warehouse?.code}</td>
                          <td className="px-5 py-4 font-mono text-sm">
                            <span className={item.quantity === 0 ? 'text-ims-danger font-bold' : 'text-ims-warning font-bold'}>
                              {formatNumber(item.quantity)}
                            </span>
                            <span className="mx-1 text-ims-slate/40">/</span>
                            <span className="text-ims-slate">{formatNumber(item.product?.minimum_stock)}</span>
                          </td>
                          <td className="px-5 py-4">
                            {item.quantity === 0 ? (
                              <Badge variant="destructive" className="border-none shadow-none">{t.outOfStock}</Badge>
                            ) : (
                              <Badge variant="warning" className="border-none shadow-none">{t.lowStock}</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-ims-slate/10 p-5 text-center">
                  <Link to="/inventory" className="text-sm font-bold text-ims-blue hover:underline">{t.viewAllLowStock}</Link>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Section 4: Recent Activities */}
        <section className="min-w-0">
          <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-ims-slate/20 bg-white">
            <div className="flex items-center justify-between border-b border-ims-slate/10 p-5">
              <h3 className="text-base font-bold text-ims-navy">{t.recentActivities}</h3>
              <Link to="/audit" className="text-sm font-semibold text-ims-blue hover:underline">{t.viewAll}</Link>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-5"><ListSkeleton count={4} /></div>
              ) : movements.length === 0 ? (
                <div className="p-6 text-center text-sm text-ims-slate">{t.noActivities}</div>
              ) : (
                <div className="divide-y divide-ims-slate/10">
                  {movements.slice(0, 5).map((activity) => {
                    const dateObj = new Date(activity.created_at)
                    const dayStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

                    return (
                      <div key={activity.id} className="flex items-center gap-4 p-5 transition-colors hover:bg-ims-cream/30">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ims-cream/50 text-ims-blue">
                          <Archive size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-ims-navy">{movementTitle(activity.type, t)}</p>
                          <p className="mt-0.5 truncate text-xs font-medium text-ims-slate/80">
                            {activity.product?.sku} - {activity.type === 'IN' ? '+' : activity.type === 'OUT' ? '-' : ''}{formatNumber(activity.quantity)} {t.unitsCount.toLowerCase()}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs font-medium text-ims-slate/70">
                          <p>{dayStr}</p>
                          <p className="mt-0.5">{timeStr}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard
