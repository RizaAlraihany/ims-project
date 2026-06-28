import { ClipboardCheck, Eye, Plus, Search, CheckCircle2, AlertCircle } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { stockOpnamesApi } from '@/api/stockOpnames'
import { MetricCard, OperationsChartGrid } from '@/components/analytics/OperationalCharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'

const statusOptions = ['ALL', 'DRAFT', 'COUNTING', 'REVIEW', 'ADJUSTED']

function statusVariant(status) {
  return {
    DRAFT: 'outline',
    COUNTING: 'warning',
    REVIEW: 'warning',
    APPROVED: 'success',
    ADJUSTED: 'success',
  }[status] ?? 'outline'
}

function statusLabel(status, t) {
  return {
    ALL: t.allStatus,
    DRAFT: t.draft,
    COUNTING: t.counting,
    REVIEW: t.review,
    APPROVED: t.approved,
    ADJUSTED: t.adjusted,
  }[status] ?? status
}

function StockOpnameList() {
  const { t } = useLanguage()
  const [opnames, setOpnames] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadOpnames() {
      setIsLoading(true)
      setError('')

      try {
        const response = await stockOpnamesApi.list({
          page,
          per_page: 10,
          search: search || undefined,
          status: status === 'ALL' ? undefined : status,
        })

        if (!ignore) {
          setOpnames(response.data?.data ?? [])
          setMeta({
            current_page: response.data?.current_page ?? 1,
            last_page: response.data?.last_page ?? 1,
            total: response.data?.total ?? 0,
          })
        }
      } catch (error) {
        if (!ignore) setError(apiErrorMessage(error, 'Stock opname belum dapat dimuat.'))
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    const timer = setTimeout(loadOpnames, 300)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [page, search, status])

  const draftCount = useMemo(() => opnames.filter(o => o.status === 'DRAFT').length, [opnames])
  const reviewCount = useMemo(() => opnames.filter(o => o.status === 'REVIEW').length, [opnames])
  const adjustedCount = useMemo(() => opnames.filter(o => o.status === 'ADJUSTED' || o.status === 'APPROVED').length, [opnames])
  const countingCount = useMemo(() => opnames.filter(o => o.status === 'COUNTING').length, [opnames])
  const chartLabels = [t.draft, t.counting, t.review, t.adjusted]
  const chartValues = [draftCount, countingCount, reviewCount, adjustedCount]

  return (
    <div className="space-y-6">
      {/* Removed Page Header */}

      {/* Summary Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={ClipboardCheck} label={t.totalSession} value={meta.total.toLocaleString('en-US')} helper={t.stockOpname} tone="blue" />
        <MetricCard icon={ClipboardCheck} label={t.draft} value={draftCount.toLocaleString('en-US')} helper={t.createSession} tone="navy" />
        <MetricCard icon={AlertCircle} label={t.needReview} value={reviewCount.toLocaleString('en-US')} helper={t.review} tone="warning" />
        <MetricCard icon={CheckCircle2} label={t.adjusted} value={adjustedCount.toLocaleString('en-US')} helper={t.approved} tone="success" />
      </div>

      <OperationsChartGrid
        bar={{
          title: 'Opname Workflow',
          subtitle: 'Status sesi opname pada halaman aktif',
          labels: chartLabels,
          emptyText: isLoading ? t.loading : t.noOpnameData,
          series: [{ label: t.stockOpname, values: chartValues, className: 'bg-ims-blue' }],
        }}
        donut={{
          title: 'Opname Mix',
          subtitle: t.currentStockMix,
          centerLabel: t.stockOpname,
          centerValue: chartValues.reduce((sum, value) => sum + value, 0).toLocaleString('en-US'),
          emptyText: isLoading ? t.loading : t.noOpnameData,
          items: [
            { label: t.draft, value: draftCount, color: '#7288AE', displayValue: draftCount.toLocaleString('en-US') },
            { label: t.counting, value: countingCount, color: '#4B5694', displayValue: countingCount.toLocaleString('en-US') },
            { label: t.review, value: reviewCount, color: '#D97706', displayValue: reviewCount.toLocaleString('en-US') },
            { label: t.adjusted, value: adjustedCount, color: '#047857', displayValue: adjustedCount.toLocaleString('en-US') },
          ],
        }}
      />

      {error ? (
        <div className="rounded-[10px] border border-ims-danger/20 bg-ims-danger/10 p-3 text-sm text-ims-danger">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-ims-slate/20 bg-white">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-ims-slate/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap gap-3">
            <div className="relative w-full sm:w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ims-slate/80" size={14} />
              <Input 
                className="h-10 border-ims-slate/20 bg-white pl-9 text-[13px]" 
                placeholder={t.searchReferenceProducts}
                value={search} 
                onChange={(event) => { setSearch(event.target.value); setPage(1) }} 
              />
            </div>
            <Select className="w-full text-[13px] sm:w-[150px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>{t.status}: {statusLabel(option, t)}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="bg-ims-navy text-white hover:bg-ims-blue">
              <Link to="/opname/create"><Plus size={14} className="mr-1" /> {t.createSession}</Link>
            </Button>
          </div>
        </div>

        {/* Data Grid */}
        <div>
          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto lg:block">
            {isLoading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : opnames.length === 0 ? (
              <p className="p-6 text-center text-sm text-ims-slate">{t.noOpnameData}</p>
            ) : (
              <table className="min-w-full text-left text-xs">
                <thead className="ims-table-head border-b border-ims-slate/20">
                  <tr>
                    <th className="px-4 py-3">{t.sessionNo}</th>
                    <th className="px-4 py-3">{t.warehouse}</th>
                    <th className="px-4 py-3 text-center">{t.items}</th>
                    <th className="px-4 py-3">{t.status}</th>
                    <th className="px-4 py-3">{t.officer}</th>
                    <th className="px-4 py-3 text-right">{t.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ims-slate/10">
                  {opnames.map((opname) => (
                    <tr key={opname.id} className="transition-colors hover:bg-ims-cream/25">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-ims-navy">{opname.opname_no}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-ims-navy">{opname.warehouse?.code}</span>
                        <span className="ml-2 text-ims-slate">{opname.warehouse?.name}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono">{opname.items_count}</td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant={statusVariant(opname.status)} 
                          className={['ADJUSTED', 'APPROVED'].includes(opname.status) ? 'border-ims-success/30 text-ims-success' : ''}
                        >
                          {statusLabel(opname.status, t)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-ims-slate">{opname.performer?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/opname/${opname.id}`}><Eye size={15} className="mr-1" /> {t.detail}</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="divide-y divide-ims-slate/10 lg:hidden">
            {isLoading ? (
              <CardSkeleton count={4} />
            ) : opnames.length === 0 ? (
              <p className="p-4 text-center text-sm text-ims-slate">{t.noOpnameData}</p>
            ) : null}
            {!isLoading && opnames.map((opname) => (
              <article key={opname.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-ims-navy">{opname.opname_no}</p>
                    <p className="mt-1 text-xs text-ims-slate">{opname.warehouse?.code} - {opname.items_count} item</p>
                  </div>
                  <Badge 
                    variant={statusVariant(opname.status)} 
                    className={['ADJUSTED', 'APPROVED'].includes(opname.status) ? 'border-ims-success/30 text-ims-success text-[10px]' : 'text-[10px]'}
                  >
                    {statusLabel(opname.status, t)}
                  </Badge>
                </div>
                <Button asChild className="mt-4 w-full" size="sm" variant="outline">
                  <Link to={`/opname/${opname.id}`}><ClipboardCheck size={15} className="mr-1" /> {t.countAndApproval}</Link>
                </Button>
              </article>
            ))}
          </div>
        </div>

        {/* Pagination Info */}
        <div className="flex items-center justify-between border-t border-ims-slate/10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="hidden text-[12px] font-medium text-ims-navy/80 sm:block">
            {t.showing} {meta.total === 0 ? 0 : ((page - 1) * 10) + 1} {t.to} {Math.min(page * 10, meta.total)} {t.of} {meta.total.toLocaleString('en-US')} session
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

export default StockOpnameList
