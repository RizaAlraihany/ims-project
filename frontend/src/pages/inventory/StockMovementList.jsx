import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { movementsApi } from '@/api/movements'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'
import { formatDate } from '@/utils/formatDate'
import { OperationsChartGrid, ChartFilter } from '@/components/analytics/OperationalCharts'
import { trendLabels, monthlyLabels, movementBucketIndex } from '@/utils/chartHelpers'

function StockMovementList({ mode }) {
  const { t } = useLanguage()
  const isStockIn = mode === 'in'
  
  const [movements, setMovements] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartMovements, setChartMovements] = useState([])
  const [period, setPeriod] = useState('weekly')
  const isWeekly = period === 'weekly'

  useEffect(() => {
    let ignore = false

    async function loadMovements() {
      setIsLoading(true)
      setError('')

      try {
        const response = await movementsApi.list({
          page,
          per_page: 10,
          search: search || undefined,
          type: isStockIn ? 'IN' : 'OUT',
        })

        if (!ignore) {
          setMovements(response.data?.data ?? [])
          setMeta({
            current_page: response.data?.current_page ?? 1,
            last_page: response.data?.last_page ?? 1,
            total: response.data?.total ?? 0,
          })
        }
      } catch (error) {
        if (!ignore) setError(apiErrorMessage(error, 'Gagal memuat data mutasi.'))
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    const timer = setTimeout(loadMovements, 300)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [page, search, isStockIn])

  useEffect(() => {
    let ignore = false
    async function loadChartMovements() {
      try {
        const response = await movementsApi.list({
          per_page: 200,
          type: isStockIn ? 'IN' : 'OUT',
        })
        if (!ignore) {
          setChartMovements(response.data?.data ?? [])
        }
      } catch {
        // silently ignore chart error
      }
    }
    loadChartMovements()
    return () => {
      ignore = true
    }
  }, [isStockIn])

  const chartLabels = isWeekly ? trendLabels : monthlyLabels
  
  const chartValues = useMemo(() => {
    const length = isWeekly ? 7 : 4
    const values = Array.from({ length }, () => 0)
    
    chartMovements.forEach((movement) => {
      const index = movementBucketIndex(movement.created_at, isWeekly)
      if (index >= 0) {
        values[index] += Math.abs(Number(movement.signed_quantity ?? movement.quantity ?? 0))
      }
    })
    
    return values
  }, [chartMovements, isWeekly])
  
  const totalQty = chartValues.reduce((sum, val) => sum + val, 0)

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-[10px] border border-ims-danger/20 bg-ims-danger/10 p-3 text-sm text-ims-danger">
          {error}
        </div>
      ) : null}

      <div className="mb-6">
        <OperationsChartGrid
          bar={{
            title: isStockIn ? t.stockIn || 'Barang Masuk' : t.stockOut || 'Barang Keluar',
            subtitle: t.movementLedger || 'Tren aktivitas mutasi stok',
            labels: chartLabels,
            emptyText: isLoading ? t.loading : t.noActivities,
            action: <ChartFilter period={period} onChange={setPeriod} />,
            series: [{ 
              label: t.qty || 'Qty', 
              values: chartValues, 
              className: isStockIn ? 'bg-ims-success' : 'bg-ims-warning' 
            }],
          }}
          donut={{
            title: `${isStockIn ? t.stockIn || 'Barang Masuk' : t.stockOut || 'Barang Keluar'} Mix`,
            subtitle: t.movementLedger || 'Komposisi mutasi stok',
            centerLabel: t.qty || 'Qty',
            centerValue: totalQty.toLocaleString('en-US'),
            emptyText: isLoading ? t.loading : t.noActivities,
            items: [
              { 
                label: isStockIn ? t.stockIn || 'Barang Masuk' : t.stockOut || 'Barang Keluar', 
                value: totalQty, 
                color: isStockIn ? '#047857' : '#D97706', 
                displayValue: totalQty.toLocaleString('en-US') 
              },
            ],
          }}
        />
      </div>

      <section className="overflow-hidden rounded-3xl border border-ims-slate/20 bg-white">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-ims-slate/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap gap-3">
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ims-slate/80" size={14} />
              <Input 
                className="h-10 border-ims-slate/20 bg-white pl-9 text-[13px]" 
                placeholder={t.searchReferenceProducts || "Cari referensi atau produk..."}
                value={search} 
                onChange={(event) => { setSearch(event.target.value); setPage(1) }} 
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="bg-ims-navy text-white hover:bg-ims-blue">
              <Link to={isStockIn ? '/stock-in/create' : '/stock-out/create'}>
                <Plus size={14} className="mr-1" /> {isStockIn ? (t.inputStockIn || 'Barang Masuk') : (t.inputStockOut || 'Barang Keluar')}
              </Link>
            </Button>
          </div>
        </div>

        {/* Data Grid */}
        <div>
          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto lg:block">
            {isLoading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : movements.length === 0 ? (
              <p className="p-6 text-center text-sm text-ims-slate">{t.noData || 'Tidak ada data.'}</p>
            ) : (
              <table className="min-w-full text-left text-xs">
                <thead className="ims-table-head border-b border-ims-slate/20">
                  <tr>
                    <th className="px-4 py-3">{t.date || 'Tanggal'}</th>
                    <th className="px-4 py-3">{t.reference || 'Referensi'}</th>
                    <th className="px-4 py-3">{t.product || 'Produk'}</th>
                    <th className="px-4 py-3 text-right">{t.qty || 'Qty'}</th>
                    <th className="px-4 py-3">{isStockIn ? (t.destinationWarehouse || 'Gudang Tujuan') : (t.sourceWarehouse || 'Gudang Asal')}</th>
                    <th className="px-4 py-3">{t.user || 'User'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ims-slate/10">
                  {movements.map((movement) => (
                    <tr key={movement.id} className="transition-colors hover:bg-ims-cream/25">
                      <td className="px-4 py-3 text-ims-slate">{formatDate(movement.created_at)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-ims-navy">{movement.reference_no}</td>
                      <td className="px-4 py-3 font-medium text-ims-navy">
                        {movement.product?.name}
                        <div className="text-[11px] font-normal text-ims-slate">{movement.product?.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-ims-navy">
                        {movement.quantity} {movement.product?.unit?.symbol}
                      </td>
                      <td className="px-4 py-3 text-ims-slate">
                        {isStockIn 
                          ? (movement.destination_warehouse?.name || '-') 
                          : (movement.source_warehouse?.name || '-')}
                      </td>
                      <td className="px-4 py-3 text-ims-slate">{movement.user?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Cards View */}
          <div className="divide-y divide-ims-slate/10 lg:hidden">
            {isLoading ? (
              <TableSkeleton rows={3} cols={1} />
            ) : movements.length === 0 ? (
              <p className="p-6 text-center text-sm text-ims-slate">{t.noData || 'Tidak ada data.'}</p>
            ) : null}
            {!isLoading && movements.map((movement) => (
              <div key={movement.id} className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-ims-navy">{movement.reference_no}</span>
                  <span className="text-[11px] text-ims-slate">{formatDate(movement.created_at)}</span>
                </div>
                <div className="mb-3">
                  <p className="text-sm font-bold text-ims-navy">{movement.product?.name}</p>
                  <p className="text-[11px] text-ims-slate">SKU: {movement.product?.sku}</p>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-ims-cream/25 p-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-ims-slate">
                      {isStockIn ? (t.destinationWarehouse || 'Ke') : (t.sourceWarehouse || 'Dari')}
                    </p>
                    <p className="text-xs font-medium text-ims-navy">
                      {isStockIn 
                        ? (movement.destination_warehouse?.name || '-') 
                        : (movement.source_warehouse?.name || '-')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-ims-slate">{t.qty || 'Qty'}</p>
                    <p className="font-mono text-sm font-bold text-ims-navy">
                      {movement.quantity} <span className="text-xs font-normal text-ims-slate">{movement.product?.unit?.symbol}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Info */}
        <div className="flex items-center justify-between border-t border-ims-slate/10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="hidden text-[12px] font-medium text-ims-navy/80 sm:block">
            {t.showing || 'Menampilkan'} {meta.total === 0 ? 0 : ((page - 1) * 10) + 1} {t.to || 'hingga'} {Math.min(page * 10, meta.total)} {t.of || 'dari'} {meta.total.toLocaleString('en-US')} {t.records || 'data'}
          </div>
          <div className="text-[12px] text-ims-navy/80 sm:hidden">
            {meta.total === 0 ? 0 : ((page - 1) * 10) + 1}-{Math.min(page * 10, meta.total)} / {meta.total}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ims-slate/20 text-ims-slate transition-colors hover:bg-ims-cream/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-[10px]">{'<'}</span>
            </button>
            <div className="hidden items-center gap-1 sm:flex">
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
      </section>
    </div>
  )
}

export default StockMovementList
