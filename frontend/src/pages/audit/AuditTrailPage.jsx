import { Eye, ShieldCheck, Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { useEffect, useState } from 'react'
import { auditLogsApi } from '@/api/auditLogs'
import { MetricCard, OperationsChartGrid } from '@/components/analytics/OperationalCharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'
import { formatDate } from '@/utils/formatDate'

const actionOptions = [
  'ALL',
  'LOGIN',
  'LOGOUT',
  'CREATE',
  'UPDATE',
  'DELETE',
  'STOCK_IN',
  'STOCK_OUT',
  'TRANSFER_CREATE',
  'TRANSFER_APPROVAL',
  'TRANSFER_RECEIVE',
  'TRANSFER_REJECT',
  'STOCK_OPNAME_CREATE',
  'STOCK_OPNAME_SAVE_ITEM',
  'STOCK_OPNAME_APPROVE',
  'PRODUCT_IMPORT',
]

function actionLabel(action, t) {
  return {
    ALL: t.allActions,
    LOGIN: 'Login',
    LOGOUT: 'Logout',
    CREATE: t.add,
    UPDATE: t.update,
    DELETE: t.delete,
    STOCK_IN: t.stockInStatus,
    STOCK_OUT: t.stockOutStatus,
    TRANSFER_CREATE: t.createTransfer,
    TRANSFER_APPROVAL: t.approveTransfer,
    TRANSFER_RECEIVE: t.receiveItems,
    TRANSFER_REJECT: t.reject,
    STOCK_OPNAME_CREATE: t.newStockOpname,
    STOCK_OPNAME_SAVE_ITEM: t.save,
    STOCK_OPNAME_APPROVE: t.approved,
    PRODUCT_IMPORT: `${t.import} ${t.product}`,
  }[String(action).toUpperCase()] ?? action
}

function renderAuditBadge(action, t) {
  const valStr = String(action).toUpperCase()
  if (['LOGIN'].includes(valStr)) {
    return <Badge variant="default" className="border-none text-[10px] font-extrabold tracking-wider shadow-none">{actionLabel(action, t)}</Badge>
  }
  if (['LOGOUT'].includes(valStr)) {
    return <Badge variant="outline" className="bg-ims-slate/10 text-[10px] font-extrabold tracking-wider shadow-none">{actionLabel(action, t)}</Badge>
  }
  if (['CREATE', 'STOCK_IN', 'TRANSFER_RECEIVE'].includes(valStr)) {
    return <Badge variant="success" className="border-none text-[10px] font-extrabold tracking-wider shadow-none">{actionLabel(action, t)}</Badge>
  }
  if (['UPDATE', 'STOCK_OUT', 'TRANSFER_APPROVAL', 'STOCK_OPNAME_APPROVE'].includes(valStr)) {
    return <Badge variant="warning" className="border-none text-[10px] font-extrabold tracking-wider shadow-none">{actionLabel(action, t)}</Badge>
  }
  if (['DELETE', 'TRANSFER_REJECT'].includes(valStr)) {
    return <Badge variant="destructive" className="border-none text-[10px] font-extrabold tracking-wider shadow-none">{actionLabel(action, t)}</Badge>
  }
  return <Badge variant="outline" className="border-none bg-ims-slate/10 text-[10px] font-extrabold tracking-wider text-ims-slate shadow-none">{actionLabel(action, t)}</Badge>
}

function JsonBlock({ title, value, emptyText }) {
  return (
    <div className="rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-ims-slate">{title}</p>
      <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-ims-navy">
        {value ? JSON.stringify(value, null, 2) : emptyText}
      </pre>
    </div>
  )
}

function AuditTrailPage() {
  const { t } = useLanguage()
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState({})
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [filters, setFilters] = useState({
    user_id: '',
    action: 'ALL',
    date_from: '',
    date_to: '',
  })
  const [dateRange, setDateRange]     = useState({ from: undefined, to: undefined })
  const [tempDateRange, setTempDateRange] = useState({ from: undefined, to: undefined })
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  function applyDateRange() {
    setDateRange(tempDateRange)
    setIsFilterOpen(false)
    setFilters(f => ({
      ...f,
      date_from: tempDateRange.from ? format(tempDateRange.from, 'yyyy-MM-dd') : '',
      date_to: tempDateRange.to ? format(tempDateRange.to, 'yyyy-MM-dd') : '',
    }))
    setPage(1)
  }

  function cancelDateRange() {
    setTempDateRange(dateRange)
    setIsFilterOpen(false)
  }

  useEffect(() => {
    let ignore = false

    async function loadAuditLogs() {
      setIsLoading(true)
      setError('')

      try {
        const response = await auditLogsApi.list({
          page,
          per_page: 10,
          user_id: filters.user_id || undefined,
          action: filters.action === 'ALL' ? undefined : filters.action,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        })
        const payload = response.data?.data ?? {}

        if (!ignore) {
          setLogs(payload.items ?? [])
          setSummary(payload.summary ?? {})
          setPagination(payload.pagination ?? { current_page: 1, last_page: 1, total: 0 })
        }
      } catch (error) {
        if (!ignore) setError(apiErrorMessage(error, 'Audit trail belum dapat dimuat.'))
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    const timer = setTimeout(loadAuditLogs, 300)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [filters, page])

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }))
    setPage(1)
  }

  const auditChartLabels = [t.totalRecords, 'Login', t.stockMovement]
  const auditChartValues = [
    Number(summary.total_rows ?? pagination.total ?? 0),
    Number(summary.login_count ?? 0),
    Number(summary.mutation_count ?? 0),
  ]

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ims-slate">{t.auditTrail}</p>
          <h2 className="text-2xl font-bold text-ims-navy">{t.auditActivityLedger}</h2>
        </div>
        <div className="rounded-2xl border border-ims-slate/20 bg-white px-4 py-2 text-xs font-bold text-ims-slate">
          {pagination.total} {t.logsRecorded}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={ShieldCheck}
          label={t.totalRecords}
          value={Number(summary.total_rows ?? pagination.total ?? 0).toLocaleString('en-US')}
          helper={t.logsRecorded}
          tone="blue"
        />
        <MetricCard
          icon={Eye}
          label="Login"
          value={Number(summary.login_count ?? 0).toLocaleString('en-US')}
          helper={t.auditTrail}
          tone="success"
        />
        <MetricCard
          icon={CalendarIcon}
          label={t.stockMovement}
          value={Number(summary.mutation_count ?? 0).toLocaleString('en-US')}
          helper={t.movementLedger}
          tone="warning"
        />
      </section>

      {error ? (
        <div className="rounded-[10px] border border-ims-danger/20 bg-ims-danger/10 p-3 text-sm text-ims-danger">
          {error}
        </div>
      ) : null}

      <OperationsChartGrid
        bar={{
          title: 'Audit Activity Trend',
          subtitle: 'Ringkasan aktivitas sistem berdasarkan filter aktif',
          labels: auditChartLabels,
          emptyText: isLoading ? t.loading : t.auditNotFound,
          series: [{ label: t.logs, values: auditChartValues, className: 'bg-ims-blue' }],
        }}
        donut={{
          title: 'Audit Mix',
          subtitle: 'Komposisi login dan mutasi stok',
          centerLabel: t.logs,
          centerValue: auditChartValues.reduce((sum, value) => sum + value, 0).toLocaleString('en-US'),
          emptyText: isLoading ? t.loading : t.auditNotFound,
          items: [
            { label: t.totalRecords, value: auditChartValues[0], color: '#4B5694', displayValue: auditChartValues[0].toLocaleString('en-US') },
            { label: 'Login', value: auditChartValues[1], color: '#047857', displayValue: auditChartValues[1].toLocaleString('en-US') },
            { label: t.stockMovement, value: auditChartValues[2], color: '#D97706', displayValue: auditChartValues[2].toLocaleString('en-US') },
          ],
        }}
      />

      <section className="overflow-hidden rounded-3xl border border-ims-slate/20 bg-white">
        {/* Filter Toolbar */}
        <div className="flex w-full flex-col gap-4 border-b border-ims-slate/10 p-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-ims-slate">User</label>
              <Input 
                className="w-full text-[13px] border-ims-slate/20 h-10 shadow-sm" 
                min="1" 
                placeholder={`${t.allUsers} (User ID)`}
                type="number" 
                value={filters.user_id} 
                onChange={(event) => updateFilter('user_id', event.target.value)} 
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-ims-slate">{t.allActions}</label>
              <Select className="h-10 text-[13px] border-ims-slate/20 shadow-sm w-full" value={filters.action} onChange={(event) => updateFilter('action', event.target.value)}>
                {actionOptions.map((action) => (
                  <option key={action} value={action}>{actionLabel(action, t)}</option>
                ))}
              </Select>
            </div>
            <div className="flex-[1.5] relative">
              <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-ims-slate">{t.dateRange}</label>
              
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex h-10 w-full items-center justify-between rounded-xl border border-ims-slate/20 bg-white px-3 text-[13px] text-ims-navy hover:bg-ims-cream/25 focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} className="text-ims-slate" />
                  <span className="font-medium">
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'dd MMM yyyy')} - {format(dateRange.to, 'dd MMM yyyy')}
                        </>
                      ) : (
                        format(dateRange.from, 'dd MMM yyyy')
                      )
                    ) : (
                      t.selectDate
                    )}
                  </span>
                </div>
                <ChevronDown size={16} className="text-ims-slate/80" />
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 flex w-max min-w-[320px] max-w-[95vw] flex-col overflow-hidden rounded-3xl border border-ims-slate/20 bg-white shadow-xl shadow-ims-navy/10" style={{ animation: 'selectDropdownIn 150ms ease-out' }}>
                  
                  {/* Header inside popup */}
                  <div className="p-4 border-b border-ims-slate/10 bg-white">
                    <div className="flex items-center justify-between border-2 border-ims-blue rounded-[10px] px-4 py-2.5">
                      <span className="text-sm font-bold text-ims-navy">
                        {tempDateRange?.from ? format(tempDateRange.from, 'd MMM yyyy') : t.startDate}
                        {' — '}
                        {tempDateRange?.to ? format(tempDateRange.to, 'd MMM yyyy') : t.endDate}
                      </span>
                      <CalendarIcon size={18} className="text-ims-blue" />
                    </div>
                  </div>

                  {/* Calendar body */}
                  <div className="p-4 bg-white flex justify-center overflow-x-auto">
                    <Calendar
                      mode="range"
                      selected={tempDateRange}
                      onSelect={(r) => setTempDateRange(r || { from: undefined, to: undefined })}
                      numberOfMonths={2}
                      className="border-none p-0 min-w-max"
                    />
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center justify-between border-t border-ims-slate/10 bg-ims-cream/25 p-4">
                    <div className="text-[13px] font-bold text-ims-slate">
                      {tempDateRange?.from && tempDateRange?.to ? (
                        <span>{differenceInDays(tempDateRange.to, tempDateRange.from)} {t.days}</span>
                      ) : (
                        <span>0 {t.days}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={cancelDateRange} className="px-5 py-2 text-[13px] font-bold text-ims-slate border border-ims-slate/20 rounded-lg hover:bg-ims-slate/10 transition-colors">
                        {t.cancel}
                      </button>
                      <button onClick={applyDateRange} className="px-5 py-2 text-[13px] font-bold text-white bg-ims-blue rounded-lg hover:bg-ims-navy transition-colors shadow-sm">
                        {t.done}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* Data Grid */}
        <div>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            {isLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : (
              <div className="flex flex-col">
                <table className="min-w-full text-left text-sm border-collapse">
                  <thead className="ims-table-head border-b border-ims-slate/20">
                    <tr>
                      <th className="px-6 py-5 whitespace-nowrap">{t.dateTime}</th>
                      <th className="px-6 py-5">User</th>
                      <th className="px-6 py-5">{t.action}</th>
                      <th className="px-6 py-5">{t.table}</th>
                      <th className="px-6 py-5">{t.recordId}</th>
                      <th className="px-6 py-5 text-right">{t.details}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ims-slate/20">
                    {logs.length === 0 ? <tr><td className="px-6 py-8 text-center text-[13px] text-ims-slate" colSpan="6">{t.auditNotFound}</td></tr> : null}
                    {logs.map((log) => (
                      <tr key={log.id} className="transition-colors hover:bg-ims-cream/25">
                        <td className="px-6 py-5 whitespace-nowrap text-[13px] text-ims-slate font-medium">{formatDate(log.created_at)}</td>
                        <td className="px-6 py-5 font-bold text-ims-navy text-[13px]">{log.user ?? `User #${log.user_id ?? '-'}`}</td>
                        <td className="px-6 py-5">
                          {renderAuditBadge(log.action, t)}
                        </td>
                        <td className="px-6 py-5 text-[13px] text-ims-slate font-medium">{log.table_name ?? '-'}</td>
                        <td className="px-6 py-5 font-medium text-ims-navy text-[13px]">{log.record_id ?? '-'}</td>
                        <td className="px-6 py-5 text-right">
                          <Button size="sm" variant="outline" className="h-8 px-4 text-[12px] font-semibold text-ims-blue border-ims-blue/30 hover:bg-ims-blue/5 shadow-none" onClick={() => setSelectedLog(log)}>
                            {t.view}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="divide-y divide-ims-slate/10 lg:hidden">
            {isLoading ? (
              <p className="p-4 text-center text-sm text-ims-slate">Memuat data...</p>
            ) : logs.length === 0 ? (
              <p className="p-4 text-center text-sm text-ims-slate">{t.auditNotFound}</p>
            ) : null}
            {!isLoading && logs.map((log) => (
              <article key={log.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ims-navy">{log.user ?? `User #${log.user_id ?? '-'}`}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ims-slate">{formatDate(log.created_at)}</p>
                  </div>
                  <Badge className="text-[10px]">
                    {actionLabel(log.action, t)}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-ims-cream/25 p-2 border border-ims-slate/10">
                    <p className="text-[10px] font-bold uppercase text-ims-slate">{t.table}</p>
                    <p className="font-mono font-bold text-ims-navy mt-1">{log.table_name ?? '-'}</p>
                  </div>
                  <div className="rounded-lg bg-ims-cream/25 p-2 border border-ims-slate/10">
                    <p className="text-[10px] font-bold uppercase text-ims-slate">IP</p>
                    <p className="font-mono font-bold text-ims-navy mt-1">{log.ip_address ?? '-'}</p>
                  </div>
                </div>
                <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => setSelectedLog(log)}>
                  <Eye size={14} className="mr-1" /> {t.viewDetails}
                </Button>
              </article>
            ))}
          </div>
        </div>

        {/* Pagination Info */}
        <div className="flex items-center justify-between border-t border-ims-slate/10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="hidden text-[12px] font-medium text-ims-navy/80 sm:block">
            {t.showing} {pagination.total === 0 ? 0 : ((page - 1) * 10) + 1} {t.to} {Math.min(page * 10, pagination.total)} {t.of} {pagination.total.toLocaleString('en-US')} {t.logs}
          </div>
          <div className="text-[12px] text-ims-navy/80 sm:hidden">
            {pagination.total === 0 ? 0 : ((page - 1) * 10) + 1}-{Math.min(page * 10, pagination.total)} / {pagination.total}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ims-slate/20 text-ims-slate transition-colors hover:bg-ims-cream/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-[10px]">{'<'}</span>
            </button>
            <div className="hidden items-center gap-1 sm:flex">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-ims-navy text-[12px] font-bold text-white">
                {page}
              </button>
              {pagination.last_page > page && (
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[12px] font-semibold text-ims-navy/80 transition-colors hover:bg-ims-cream/25" onClick={() => setPage(p => p + 1)}>
                  {page + 1}
                </button>
              )}
              {pagination.last_page > page + 1 && (
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[12px] font-semibold text-ims-navy/80 transition-colors hover:bg-ims-cream/25" onClick={() => setPage(p => p + 2)}>
                  {page + 2}
                </button>
              )}
              {pagination.last_page > page + 2 && (
                <span className="flex h-8 w-8 items-center justify-center text-[12px] font-medium text-ims-slate/50">...</span>
              )}
              {pagination.last_page > page + 3 && (
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[12px] font-semibold text-ims-navy/80 transition-colors hover:bg-ims-cream/25" onClick={() => setPage(pagination.last_page)}>
                  {pagination.last_page}
                </button>
              )}
            </div>
            <button
              disabled={page >= pagination.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ims-slate/20 text-ims-slate transition-colors hover:bg-ims-cream/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-[10px]">{'>'}</span>
            </button>
          </div>
        </div>
      </section>

      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={selectedLog ? `Audit #${selectedLog.id}` : ''}
        size="xl"
      >
        {selectedLog ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-ims-slate/10 pb-4">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-ims-navy text-white">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ims-navy">{t.auditDetail}</h3>
                <p className="text-xs text-ims-slate">{t.auditDetailDescription}</p>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-ims-slate/20 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-ims-slate">{t.userInformation}</p>
                <p className="mt-2 text-sm font-bold text-ims-navy">{selectedLog.user ?? `User #${selectedLog.user_id ?? '-'}`}</p>
                <p className="mt-1 font-mono text-xs text-ims-slate">{selectedLog.ip_address ?? 'No IP Address'}</p>
              </div>
              <div className="rounded-3xl border border-ims-slate/20 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-ims-slate">{t.actionTarget}</p>
                <div className="mt-2 flex items-center gap-2">
                  {renderAuditBadge(selectedLog.action, t)}
                </div>
                <p className="mt-2 font-mono text-xs text-ims-slate">
                  {t.table}: <span className="font-bold text-ims-navy">{selectedLog.table_name ?? '-'}</span> | ID: <span className="font-bold text-ims-navy">{selectedLog.record_id ?? '-'}</span>
                </p>
              </div>
            </div>
            
            <div className="grid gap-4 lg:grid-cols-2">
              <JsonBlock title={t.oldValues} value={selectedLog.old_values} emptyText={t.noChangesRecorded} />
              <JsonBlock title={t.newValues} value={selectedLog.new_values} emptyText={t.noChangesRecorded} />
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}

export default AuditTrailPage
