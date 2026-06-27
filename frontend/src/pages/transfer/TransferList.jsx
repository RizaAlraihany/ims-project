import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRightLeft, CheckCircle2, Eye, PackageCheck, Plus, Search } from 'lucide-react'
import { transfersApi } from '@/api/transfers'
import { MetricCard, OperationsChartGrid } from '@/components/analytics/OperationalCharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'

const statusOptions = ['ALL', 'DRAFT', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'REJECTED']

function statusVariant(status) {
  return {
    DRAFT: 'outline',
    APPROVED: 'warning',
    IN_TRANSIT: 'warning',
    RECEIVED: 'success',
    COMPLETED: 'success',
    REJECTED: 'destructive',
  }[status] ?? 'outline'
}

function statusLabel(status, t) {
  return {
    ALL: t.allStatus,
    DRAFT: t.draft,
    APPROVED: t.approved,
    IN_TRANSIT: t.inTransit,
    RECEIVED: t.received,
    COMPLETED: t.completed,
    REJECTED: t.rejected,
  }[status] ?? status
}

function TransferList() {
  const { t } = useLanguage()
  const [transfers, setTransfers] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadTransfers() {
      setIsLoading(true)
      setError('')

      try {
        const response = await transfersApi.list({
          page,
          per_page: 10,
          search: search || undefined,
          status: status === 'ALL' ? undefined : status,
        })

        if (!ignore) {
          setTransfers(response.data?.data ?? [])
          setMeta({
            current_page: response.data?.current_page ?? 1,
            last_page: response.data?.last_page ?? 1,
            total: response.data?.total ?? 0,
          })
        }
      } catch (error) {
        if (!ignore) setError(apiErrorMessage(error, 'Transfer belum dapat dimuat.'))
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    const timer = setTimeout(loadTransfers, 300)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [page, search, status])

  const transferSummary = useMemo(() => {
    const draft = transfers.filter((item) => item.status === 'DRAFT').length
    const inProgress = transfers.filter((item) => ['APPROVED', 'IN_TRANSIT'].includes(item.status)).length
    const completed = transfers.filter((item) => ['RECEIVED', 'COMPLETED'].includes(item.status)).length
    const rejected = transfers.filter((item) => item.status === 'REJECTED').length
    const totalItems = transfers.reduce((sum, item) => sum + Number(item.items_count ?? 0), 0)

    return { draft, inProgress, completed, rejected, totalItems }
  }, [transfers])

  const chartLabels = [t.draft, t.inTransit, t.completed, t.rejected]
  const chartValues = [transferSummary.draft, transferSummary.inProgress, transferSummary.completed, transferSummary.rejected]

  return (
    <div className="space-y-6">
      {/* Removed Page Header */}

      {error ? (
        <div className="rounded-[10px] border border-ims-danger/20 bg-ims-danger/10 p-3 text-sm text-ims-danger">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ArrowRightLeft} label={t.totalRecords} value={meta.total.toLocaleString('en-US')} helper={t.transfers} tone="blue" />
        <MetricCard icon={PackageCheck} label={t.items} value={transferSummary.totalItems.toLocaleString('en-US')} helper={t.totalQty} tone="navy" />
        <MetricCard icon={AlertCircle} label={t.inTransit} value={transferSummary.inProgress.toLocaleString('en-US')} helper={t.needReview} tone="warning" />
        <MetricCard icon={CheckCircle2} label={t.completed} value={transferSummary.completed.toLocaleString('en-US')} helper={t.received} tone="success" />
      </section>

      <OperationsChartGrid
        bar={{
          title: 'Transfer Workflow',
          subtitle: 'Distribusi status transfer pada halaman aktif',
          labels: chartLabels,
          emptyText: isLoading ? t.loading : t.noTransferData,
          series: [{ label: t.transfers, values: chartValues, className: 'bg-ims-blue' }],
        }}
        donut={{
          title: 'Transfer Mix',
          subtitle: 'Komposisi approval dan penerimaan',
          centerLabel: t.transfer,
          centerValue: chartValues.reduce((sum, value) => sum + value, 0).toLocaleString('en-US'),
          emptyText: isLoading ? t.loading : t.noTransferData,
          items: [
            { label: t.draft, value: transferSummary.draft, color: '#7288AE', displayValue: transferSummary.draft.toLocaleString('en-US') },
            { label: t.inTransit, value: transferSummary.inProgress, color: '#D97706', displayValue: transferSummary.inProgress.toLocaleString('en-US') },
            { label: t.completed, value: transferSummary.completed, color: '#047857', displayValue: transferSummary.completed.toLocaleString('en-US') },
            { label: t.rejected, value: transferSummary.rejected, color: '#B91C1C', displayValue: transferSummary.rejected.toLocaleString('en-US') },
          ],
        }}
      />

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
            <Select className="w-full text-[13px] sm:w-[170px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>{t.status}: {statusLabel(option, t)}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="bg-ims-navy text-white hover:bg-ims-blue">
              <Link to="/transfer/create"><Plus size={14} className="mr-1" /> {t.createTransfer}</Link>
            </Button>
          </div>
        </div>

        {/* Data Grid */}
        <div>
          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto lg:block">
            {isLoading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : transfers.length === 0 ? (
              <p className="p-6 text-center text-sm text-ims-slate">{t.noTransferData}</p>
            ) : (
              <table className="min-w-full text-left text-xs">
                <thead className="ims-table-head border-b border-ims-slate/20">
                  <tr>
                    <th className="px-4 py-3">{t.transferNo}</th>
                    <th className="px-4 py-3">{t.sourceWarehouse}</th>
                    <th className="px-4 py-3">{t.destinationWarehouse}</th>
                    <th className="px-4 py-3 text-center">{t.items}</th>
                    <th className="px-4 py-3 text-center">{t.status}</th>
                    <th className="px-4 py-3 text-right">{t.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ims-slate/10">
                  {transfers.map((transfer) => (
                    <tr key={transfer.id} className="transition-colors hover:bg-ims-cream/25">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-ims-navy">{transfer.transfer_no}</td>
                      <td className="px-4 py-3 text-ims-slate">{transfer.source_warehouse?.code ?? '-'}</td>
                      <td className="px-4 py-3 text-ims-slate">{transfer.destination_warehouse?.code ?? '-'}</td>
                      <td className="px-4 py-3 text-center font-mono">{transfer.items_count}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge 
                          variant={statusVariant(transfer.status)} 
                          className={['RECEIVED', 'COMPLETED'].includes(transfer.status) ? 'border-ims-success/30 text-ims-success' : ''}
                        >
                          {statusLabel(transfer.status, t)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/transfer/${transfer.id}`}><Eye size={15} className="mr-1" /> {t.detail}</Link>
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
            ) : transfers.length === 0 ? (
              <p className="p-4 text-center text-sm text-ims-slate">{t.noTransferData}</p>
            ) : null}
            {!isLoading && transfers.map((transfer) => (
              <article key={transfer.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-ims-navy">{transfer.transfer_no}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-ims-slate">
                      <span>{transfer.source_warehouse?.code}</span>
                      <ArrowRightLeft size={12} className="text-ims-slate/50" />
                      <span>{transfer.destination_warehouse?.code}</span>
                    </div>
                  </div>
                  <Badge 
                    variant={statusVariant(transfer.status)} 
                    className={['RECEIVED', 'COMPLETED'].includes(transfer.status) ? 'border-ims-success/30 text-ims-success text-[10px]' : 'text-[10px]'}
                  >
                    {statusLabel(transfer.status, t)}
                  </Badge>
                </div>
                <Button asChild className="mt-4 w-full" size="sm" variant="outline">
                  <Link to={`/transfer/${transfer.id}`}><Eye size={15} className="mr-1" /> {t.detail}</Link>
                </Button>
              </article>
            ))}
          </div>
        </div>

        {/* Pagination Info */}
        <div className="flex items-center justify-between border-t border-ims-slate/10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="hidden text-[12px] font-medium text-ims-navy/80 sm:block">
            {t.showing} {meta.total === 0 ? 0 : ((page - 1) * 10) + 1} {t.to} {Math.min(page * 10, meta.total)} {t.of} {meta.total.toLocaleString('en-US')} {t.transfers}
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

export default TransferList
