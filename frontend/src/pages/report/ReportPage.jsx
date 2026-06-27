import { BarChart3, Calendar as CalendarIcon, ChevronDown, ClipboardCheck, Download, Filter, Search, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { categoriesApi } from '@/api/categories'
import { reportsApi } from '@/api/reports'
import { warehousesApi } from '@/api/warehouses'
import { MetricCard, OperationsChartGrid } from '@/components/analytics/OperationalCharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRef } from 'react'
import { format, differenceInDays } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableSkeleton, CardSkeleton, Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'

// ─── Constants ───────────────────────────────────────────────────────────────

function getReportTypes(t) {
  return [
    { id: 'stocks', label: t.stock, title: t.stockReport, icon: BarChart3 },
    { id: 'movements', label: t.movement, title: t.movementReport, icon: TrendingUp },
    { id: 'transfers', label: t.transfer, title: t.transferReport, icon: Filter },
    { id: 'opnames', label: t.opname, title: t.opnameReport, icon: ClipboardCheck },
  ]
}

const movementTypes = ['', 'STOCK_IN', 'STOCK_OUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT', 'OPNAME']
const statusOptions = ['', 'DRAFT', 'COUNTING', 'REVIEW', 'APPROVED', 'ADJUSTED', 'RECEIVED', 'REJECTED']

function getReportColumns(t) {
  return {
    stocks: [
      ['sku', 'SKU'],
      ['product', t.product],
      ['warehouse_code', t.warehouse],
      ['quantity', t.qty],
      ['minimum_stock', t.minStock],
      ['status', t.status],
      ['inventory_value', t.value],
    ],
    movements: [
      ['reference_no', t.reference],
      ['movement_type', t.type],
      ['product', t.product],
      ['source_warehouse', t.source],
      ['destination_warehouse', t.destination],
      ['quantity', t.qty],
      ['created_at', t.date],
    ],
    transfers: [
      ['transfer_no', t.transferNo],
      ['source_warehouse', t.source],
      ['destination_warehouse', t.destination],
      ['items_count', t.items],
      ['total_quantity', t.totalQty],
      ['status', t.status],
      ['created_at', t.date],
    ],
    opnames: [
      ['opname_no', t.opnameNo],
      ['warehouse', t.warehouse],
      ['items_count', t.items],
      ['difference_items', t.diffItems],
      ['total_difference', t.totalDiff],
      ['status', t.status],
      ['created_at', t.date],
    ],
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function displayToken(t, value) {
  const normalized = String(value ?? '').toUpperCase().replaceAll(' ', '_')
  return {
    NORMAL: t.normal,
    LOW_STOCK: t.lowStock,
    OUT_OF_STOCK: t.outOfStock,
    STOCK_IN: t.stockInStatus,
    STOCK_OUT: t.stockOutStatus,
    TRANSFER_IN: t.transferIn,
    TRANSFER_OUT: t.transferOut,
    ADJUSTMENT: t.adjustment,
    OPNAME: t.opname,
    DRAFT: t.draft,
    COUNTING: t.counting,
    REVIEW: t.review,
    APPROVED: t.approved,
    ADJUSTED: t.adjusted,
    RECEIVED: t.received,
    REJECTED: t.rejected,
  }[normalized] ?? value
}

function renderBadge(value, t) {
  if (!value) return null;
  const valStr = String(value).toUpperCase().replace(' ', '_');

  // Success / Green
  if (['NORMAL', 'RECEIVED', 'ADJUSTED', 'STOCK_IN', 'TRANSFER_IN', 'APPROVED'].includes(valStr)) {
    return <Badge variant="success" className="border-none text-[10px] font-extrabold tracking-wider shadow-none">{displayToken(t, value)}</Badge>;
  }
  // Warning / Orange
  if (['LOW_STOCK', 'COUNTING', 'REVIEW', 'STOCK_OUT', 'TRANSFER_OUT'].includes(valStr)) {
    return <Badge variant="warning" className="border-none text-[10px] font-extrabold tracking-wider shadow-none">{displayToken(t, value)}</Badge>;
  }
  // Danger / Red
  if (['OUT_OF_STOCK', 'REJECTED'].includes(valStr)) {
    return <Badge variant="destructive" className="border-none text-[10px] font-extrabold tracking-wider shadow-none">{displayToken(t, value)}</Badge>;
  }
  // Default / Grey
  return <Badge variant="outline" className="bg-ims-slate/10 text-[10px] font-extrabold tracking-wider text-ims-slate shadow-none">{displayToken(t, value)}</Badge>;
}

function cellValue(row, key) {
  const value = row[key]
  if (key === 'created_at') return formatDate(value)
  if (typeof value === 'number') return value.toLocaleString('en-US')
  if (value === null || value === undefined || value === '') return '-'
  return value
}

function buildCsv(rows, activeType, reportColumns) {
  const header = reportColumns[activeType].map(([, label]) => label)
  const body = rows.map((row) =>
    reportColumns[activeType].map(([key]) => `"${String(cellValue(row, key)).replaceAll('"', '""')}"`)
  )
  return [header.join(','), ...body.map((row) => row.join(','))].join('\n')
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function printPdf(title, rows, activeType, reportColumns) {
  const printable = window.open('', '_blank', 'width=1100,height=800')
  if (!printable) return

  const esc = (v) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
  const tableHead = reportColumns[activeType].map(([, label]) => `<th>${esc(label)}</th>`).join('')
  const tableRows = rows.map((row) =>
    `<tr>${reportColumns[activeType].map(([key]) => `<td>${esc(cellValue(row, key))}</td>`).join('')}</tr>`
  ).join('')

  printable.document.write(`
    <html>
      <head>
        <title>${esc(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111844; padding: 24px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          p.sub { font-size: 11px; color: #7288AE; margin-bottom: 16px; }
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid rgba(114, 136, 174, 0.34); padding: 6px 10px; text-align: left; }
          th { background: #EAE0CF; font-weight: 700; font-size: 10px; text-transform: uppercase; }
          tr:nth-child(even) { background: rgba(234, 224, 207, 0.28); }
        </style>
      </head>
      <body>
        <h1>${esc(title)}</h1>
        <p class="sub">Dicetak: ${new Date().toLocaleString('id-ID')} &bull; Total: ${rows.length} baris</p>
        <table><thead><tr>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table>
      </body>
    </html>
  `)
  printable.document.close()
  printable.focus()
  printable.print()
}

// ─── Summary label map ───────────────────────────────────────────────────────

function getSummaryLabels(t) {
  return {
    total_rows: t.totalRecords,
    total_quantity: t.totalQty,
    total_value: t.inventoryValue,
    total_low_stock: t.lowStock,
    total_out_of_stock: t.outOfStock,
    total_transfers: t.transfers,
    total_approved: t.approved,
    total_rejected: t.rejected,
    total_opnames: t.stockOpname,
    total_difference: t.totalDiff,
    total_movements: t.movement,
    draft_count: t.draft,
    approved_count: t.approved,
    received_count: t.received,
    counting_count: t.counting,
    adjusted_count: t.adjusted,
    total_in: t.stockInStatus,
    total_out: t.stockOutStatus,
    total_transfer_rows: t.transfers,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

function ReportPage() {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const activeType = searchParams.get('type') || 'stocks'

  
  const [warehouses, setWarehouses] = useState([])
  const [categories, setCategories] = useState([])
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({})
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [filters, setFilters] = useState({
    search: '', warehouse_id: '', category_id: '',
    movement_type: '', status: '', date_from: '', date_to: '',
  })
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const [prevType, setPrevType] = useState(activeType)
  if (activeType !== prevType) {
    setPrevType(activeType)
    setPage(1)
  }
  const [isExporting, setIsExporting] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportType, setExportType] = useState('csv')
  const [exportDateRange, setExportDateRange] = useState({ from: undefined, to: undefined })
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined })
  const [tempDateRange, setTempDateRange] = useState({ from: undefined, to: undefined })
  const filterRef = useRef(null)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('weekly')

  const translatedReportTypes = getReportTypes(t)
  const reportColumns = getReportColumns(t)
  const summaryLabelMap = getSummaryLabels(t)

  const handleOpenFilter = () => {
    setTempDateRange(dateRange)
    setIsFilterOpen(true)
  }

  const applyDateRange = () => {
    setDateRange(tempDateRange)
    setPage(1)
    setIsFilterOpen(false)
  }

  const cancelDateRange = () => {
    setTempDateRange(dateRange)
    setIsFilterOpen(false)
  }

  const diffDays = tempDateRange?.from && tempDateRange?.to
    ? differenceInDays(tempDateRange.to, tempDateRange.from) + 1
    : (tempDateRange?.from ? 1 : 0)

  // Close filter on click outside
  useEffect(() => {
    if (!isFilterOpen) return
    function handleClick(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isFilterOpen])

  // Load filter options once
  useEffect(() => {
    let ignore = false
    async function loadOptions() {
      try {
        const [wRes, cRes] = await Promise.all([
          warehousesApi.list({ per_page: 100 }),
          categoriesApi.list({ per_page: 100 }),
        ])
        if (!ignore) {
          setWarehouses(wRes.data?.data ?? [])
          setCategories(cRes.data?.data ?? [])
        }
      } catch { /* silent */ }
    }
    loadOptions()
    return () => { ignore = true }
  }, [])

  const params = useMemo(() => {
    const base = {
      page, per_page: 10,
      search: filters.search || undefined,
      warehouse_id: filters.warehouse_id || undefined,
      category_id: filters.category_id || undefined,
      date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    }
    if (activeType === 'stocks') return { ...base }
    if (activeType === 'movements') return { ...base, movement_type: filters.movement_type || undefined }
    return { ...base, status: filters.status || undefined }
  }, [activeType, filters, page, dateRange.from, dateRange.to])

  useEffect(() => {
    let ignore = false
    async function load() {
      setIsLoading(true)
      setError('')
      try {
        const res = await reportsApi[activeType](params)
        const payload = res.data?.data ?? {}
        if (!ignore) {
          setRows(payload.items ?? [])
          setSummary(payload.summary ?? {})
          setPagination(payload.pagination ?? { current_page: 1, last_page: 1, total: 0 })
        }
      } catch (err) {
        if (!ignore) setError(apiErrorMessage(err, 'Laporan belum dapat dimuat.'))
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }
    const timer = setTimeout(load, 250)
    return () => { ignore = true; clearTimeout(timer) }
  }, [activeType, params])

  const activeReport = translatedReportTypes.find((r) => r.id === activeType) ?? translatedReportTypes[0]
  const summaryEntries = Object.entries(summary).slice(0, 4)
  const chartEntries = summaryEntries.length > 0 ? summaryEntries : [[t.loadedRows, rows.length]]

  const isWeekly = period === 'weekly'
  const trendLabelsWeekly = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const trendLabelsMonthly = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
  const barTrendLabels = isWeekly ? trendLabelsWeekly : trendLabelsMonthly

  const barSeriesData = useMemo(() => {
    const length = isWeekly ? 7 : 4
    const data = Array.from({ length }, () => 0)
    
    rows.forEach(row => {
      const dateVal = row.created_at || row.updated_at
      if (!dateVal) return
      
      let index
      const date = new Date(dateVal)
      if (Number.isNaN(date.getTime())) return
      
      if (isWeekly) {
        const day = date.getDay()
        index = day === 0 ? 6 : day - 1
      } else {
        const day = date.getDate()
        index = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3
      }
      
      if (index >= 0) {
        data[index] += Number(row.quantity ?? 1)
      }
    })
    return data
  }, [rows, isWeekly])


  function updateFilter(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }))
    setPage(1)
  }

  async function loadExportRows(overrideDateRange) {
    const customParams = { ...params, page: 1, per_page: 1000 }

    if (overrideDateRange) {
      if (overrideDateRange.from) {
        customParams.date_from = format(overrideDateRange.from, 'yyyy-MM-dd')
      } else {
        delete customParams.date_from
      }
      if (overrideDateRange.to) {
        customParams.date_to = format(overrideDateRange.to, 'yyyy-MM-dd')
      } else {
        delete customParams.date_to
      }
    }

    const res = await reportsApi[activeType](customParams)
    return res.data?.data?.items ?? []
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      const exportRows = await loadExportRows(exportDateRange)
      if (exportType === 'csv') {
        downloadCsv(`${activeType}-report.csv`, buildCsv(exportRows, activeType, reportColumns))
      } else {
        printPdf(activeReport.title, exportRows, activeType, reportColumns)
      }
    } catch (err) {
      setError(apiErrorMessage(err, `Export ${exportType.toUpperCase()} gagal.`))
    } finally {
      setIsExporting(false)
      setIsExportModalOpen(false)
    }
  }

  function openExportModal(type) {
    setExportType(type)
    setExportDateRange(dateRange)
    setIsExportModalOpen(true)
  }

  return (
    <div className="space-y-4 lg:space-y-6">

      {/* ── Summary KPI cards ─────────────────────────────────── */}
      {summaryEntries.length > 0 || isLoading ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-3xl border border-ims-slate/20 bg-white p-6 shadow-sm" style={{ opacity: 1 - i * 0.18 }}>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <Skeleton className="h-6 w-14 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))
            : summaryEntries.map(([key, value]) => (
              <MetricCard
                key={key}
                icon={activeReport.icon}
                label={summaryLabelMap[key] ?? key.replaceAll('_', ' ')}
                value={key.includes('value') ? formatCurrency(value) : Number(value ?? 0).toLocaleString('en-US')}
                helper={activeReport.label}
                tone={key.includes('out') || key.includes('rejected') ? 'danger' : key.includes('low') || key.includes('draft') ? 'warning' : 'blue'}
              />
            ))}
        </section>
      ) : null}


      <OperationsChartGrid
        bar={{
          title: `${activeReport.title} Trend`,
          subtitle: 'Ringkasan aktivitas berdasarkan waktu',
          labels: barTrendLabels,
          emptyText: isLoading ? t.loading : t.noReportData,
          action: (
            <div className="flex w-fit items-center gap-2 rounded-xl bg-ims-cream/40 p-1">
              <button 
                type="button" 
                onClick={() => setPeriod('weekly')}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${isWeekly ? 'bg-white font-bold text-ims-navy shadow-sm' : 'text-ims-slate hover:bg-white/50'}`}
              >
                Weekly
              </button>
              <button 
                type="button" 
                onClick={() => setPeriod('monthly')}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${!isWeekly ? 'bg-white font-bold text-ims-navy shadow-sm' : 'text-ims-slate hover:bg-white/50'}`}
              >
                Monthly
              </button>
            </div>
          ),
          series: [{ label: activeReport.label, values: barSeriesData, className: 'bg-ims-blue' }],
        }}
        donut={{
          title: 'Report Mix',
          subtitle: 'Komposisi summary laporan aktif',
          centerLabel: 'Records',
          centerValue: Number(pagination?.total || rows.length || 0).toLocaleString('en-US'),
          emptyText: isLoading ? t.loading : t.noReportData,
          items: chartEntries.map(([key, value], index) => ({
            label: summaryLabelMap[key] ?? key.replaceAll('_', ' '),
            value: Number(value ?? 0),
            color: ['#4B5694', '#7288AE', '#D97706', '#047857'][index] ?? '#4B5694',
            displayValue: Number(value ?? 0).toLocaleString('en-US'),
          })),
        }}
      />

      <section className="overflow-hidden rounded-3xl border border-ims-slate/20 bg-white">

        {/* ── Header: Title ──────────────────────────────────────── */}
        <div className="border-b border-ims-slate/10 px-6 pt-5 pb-4">
          <h2 className="text-xl font-black text-ims-navy">{activeReport.title}</h2>
          <p className="text-sm font-medium text-ims-slate/70">Laporan detail operasional</p>
        </div>

        {/* ── Single toolbar: Search + Filters + Date + Export ───── */}
        <div className="flex flex-wrap items-center gap-2 border-b border-ims-slate/10 px-6 py-3">

          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ims-slate/50 z-10 pointer-events-none" />
            <Input
              className="h-10 w-[210px] rounded-xl border-ims-slate/25 bg-ims-cream/20 pl-9 pr-3 text-[13px] font-medium text-ims-navy placeholder:text-ims-slate/60 focus:ring-2 focus:ring-ims-blue/20"
              placeholder={activeType === 'stocks' ? t.searchProducts : t.searchReferenceProducts}
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>

          {/* Warehouse */}
          <div className="w-[160px] shrink-0">
            <Select value={filters.warehouse_id} onChange={(e) => updateFilter('warehouse_id', e.target.value)}>
              <option value="">{t.allWarehouses}</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} – {w.name}</option>)}
            </Select>
          </div>

          {/* Category */}
          <div className="w-[160px] shrink-0">
            <Select value={filters.category_id} onChange={(e) => updateFilter('category_id', e.target.value)}>
              <option value="">{t.allCategories}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>

          {/* Movement type */}
          {activeType === 'movements' ? (
            <div className="w-[155px] shrink-0">
              <Select value={filters.movement_type} onChange={(e) => updateFilter('movement_type', e.target.value)}>
                <option value="">{t.allTypes}</option>
                {movementTypes.filter(Boolean).map((type) => <option key={type} value={type}>{displayToken(t, type)}</option>)}
              </Select>
            </div>
          ) : null}

          {/* Status */}
          {['transfers', 'opnames'].includes(activeType) ? (
            <div className="w-[155px] shrink-0">
              <Select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
                <option value="">{t.allStatuses}</option>
                {statusOptions.filter(Boolean).map((status) => <option key={status} value={status}>{displayToken(t, status)}</option>)}
              </Select>
            </div>
          ) : null}

          {/* Date range picker */}
          <div className="relative shrink-0" ref={filterRef}>
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-xl border border-ims-slate/30 bg-white px-3 text-[13px] font-medium text-ims-navy transition-all hover:border-ims-slate/40"
              onClick={isFilterOpen ? cancelDateRange : handleOpenFilter}
            >
              <CalendarIcon size={14} className="shrink-0 text-ims-slate/60" />
              <span className="whitespace-nowrap">
                {dateRange?.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, 'MMM dd')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                  ) : (
                    format(dateRange.from, 'MMM dd, yyyy')
                  )
                ) : (
                  t.allDates
                )}
              </span>
              <ChevronDown size={14} className={`shrink-0 text-ims-slate transition-transform duration-150 ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFilterOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 flex w-max min-w-[320px] max-w-[95vw] flex-col overflow-hidden rounded-3xl border border-ims-slate/20 bg-white shadow-xl shadow-ims-navy/10" style={{ animation: 'selectDropdownIn 150ms ease-out' }}>
                <div className="border-b border-ims-slate/10 p-4">
                  <div className="flex items-center justify-between rounded-[10px] border-2 border-ims-blue px-4 py-2.5">
                    <span className="text-sm font-bold text-ims-navy">
                      {tempDateRange?.from ? format(tempDateRange.from, 'd MMM yyyy') : t.startDate}
                      {' — '}
                      {tempDateRange?.to ? format(tempDateRange.to, 'd MMM yyyy') : t.endDate}
                    </span>
                    <CalendarIcon size={18} className="text-ims-blue" />
                  </div>
                </div>
                <div className="flex justify-center overflow-x-auto bg-white p-4">
                  <Calendar
                    mode="range"
                    selected={tempDateRange}
                    onSelect={(r) => setTempDateRange(r || { from: undefined, to: undefined })}
                    numberOfMonths={2}
                    className="min-w-max border-none p-0"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-ims-slate/10 bg-white p-4">
                  <span className="text-[13px] font-semibold text-ims-navy/80">
                    {diffDays > 0 ? `${diffDays} ${t.days}` : `0 ${t.days}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={cancelDateRange} className="rounded-lg border border-ims-slate/20 px-5 py-2 text-[13px] font-bold text-ims-slate transition-colors hover:bg-ims-slate/10">
                      {t.cancel}
                    </button>
                    <button onClick={applyDateRange} className="rounded-lg bg-ims-blue px-5 py-2 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-ims-navy">
                      {t.done}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Export buttons */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isExporting}
              onClick={() => openExportModal('csv')}
              className="h-10 rounded-xl border border-ims-slate/25 bg-white px-4 text-[13px] font-bold text-ims-navy/80 shadow-sm hover:bg-ims-cream/25"
            >
              <Download size={14} className="mr-1.5 text-ims-slate/70" />
              {t.export} CSV
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={isExporting}
              onClick={() => openExportModal('pdf')}
              className="h-10 rounded-xl bg-ims-blue px-4 text-[13px] font-bold text-white shadow-sm hover:bg-ims-navy"
            >
              <Download size={14} className="mr-1.5" />
              {t.export} PDF
            </Button>
          </div>

        </div>


      {error ? (
        <p className="m-6 rounded-lg border border-ims-danger/20 bg-ims-danger/10 p-3 text-xs text-ims-danger">{error}</p>
      ) : null}

      {/* ── Desktop table ─────────────────────────────────────── */}
      <div className="hidden overflow-x-auto lg:block">
        {isLoading ? (
          <TableSkeleton rows={5} cols={reportColumns[activeType].length} />
        ) : (
          <div className="flex flex-col">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="ims-table-head border-b border-ims-slate/20">
                <tr>
                  {reportColumns[activeType].map(([, label]) => (
                    <th key={label} className="px-6 py-4">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ims-slate/20">
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm text-ims-slate" colSpan={reportColumns[activeType].length}>
                      {t.noReportData}
                    </td>
                  </tr>
                ) : null}
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-ims-cream/25">
                    {reportColumns[activeType].map(([key]) => {
                      const isStatus = ['status', 'movement_type'].includes(key)
                      const val = cellValue(row, key)

                      let cellClass = "text-[13px] font-medium text-ims-navy"
                      if (['sku', 'warehouse_code', 'warehouse', 'minimum_stock', 'reference_no', 'transfer_no', 'opname_no'].includes(key)) {
                        cellClass = "text-[13px] font-medium text-ims-navy/80"
                      } else if (['quantity', 'total_quantity', 'items_count'].includes(key)) {
                        cellClass = "text-[14px] font-bold text-ims-navy"
                      }

                      return (
                        <td key={key} className="px-6 py-5">
                          {isStatus ? (
                            renderBadge(val, t)
                          ) : (
                            <span className={cellClass}>
                              {val}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Pagination Inside Card ────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-ims-slate/10 px-6 py-4">
              <div className="text-[12px] font-medium text-ims-navy/80">
                {t.showing} {((page - 1) * 10) + 1} {t.to} {Math.min(page * 10, pagination.total)} {t.of} {pagination.total.toLocaleString('en-US')} {t.items}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-ims-slate/20 text-ims-slate transition-colors hover:bg-ims-cream/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-[10px]">{'<'}</span>
                </button>
                <div className="flex items-center gap-1">
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-ims-blue text-[12px] font-bold text-white">
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
          </div>
        )}
      </div>

      {/* ── Mobile cards ──────────────────────────────────────── */}
      <div className="space-y-2 p-4 lg:hidden">
        {isLoading ? (
          <CardSkeleton count={4} />
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-ims-slate/20 bg-white p-4 text-center">
            <p className="text-xs text-ims-slate">{t.noReportData}</p>
          </div>
        ) : null}
        {!isLoading && rows.map((row) => {
          const firstCol = reportColumns[activeType][0][0]
          const secondCol = reportColumns[activeType][1][0]
          const statusVal = row.status ?? row.movement_type
          return (
            <article key={row.id} className="rounded-3xl border border-ims-slate/20 bg-white p-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-ims-navy">{cellValue(row, firstCol)}</p>
                  <p className="mt-0.5 text-[11px] text-ims-slate">{cellValue(row, secondCol)}</p>
                </div>
                {statusVal
                  ? renderBadge(statusVal, t)
                  : <Badge variant="outline" className="shrink-0">{activeReport.label}</Badge>}
              </div>
              {/* Detail grid */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                {reportColumns[activeType].slice(2, 6).map(([key, label]) => (
                  <div key={key} className="rounded-md bg-ims-cream/40 p-2">
                    <p className="text-[9px] font-black uppercase tracking-wide text-ims-slate">{label}</p>
                    <p className="mt-0.5 text-xs font-bold text-ims-navy">{cellValue(row, key)}</p>
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </div>

      {/* Mobile Pagination Only (Desktop pagination is now inside the table card) */}
      <div className="flex items-center justify-between border-t border-ims-slate/10 px-4 py-3 lg:hidden">
        <div className="text-[12px] text-ims-navy/80">
          {t.showing} {((page - 1) * 10) + 1} {t.to} {Math.min(page * 10, pagination.total)} {t.of} {pagination.total.toLocaleString('en-US')}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-[12px]"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t.previous}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-[12px]"
            disabled={page >= pagination.last_page}
            onClick={() => setPage((p) => p + 1)}
          >
            {t.next}
          </Button>
        </div>
      </div>

      {/* ── Export note ───────────────────────────────────────── */}
      </section>

      <p className="flex items-center gap-1.5 text-[11px] text-ims-slate">
        <Download size={11} />
        {t.exportNote}
      </p>

      {/* ── Export Dialog ─────────────────────────────────────── */}
      <Dialog open={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title={`${t.export} ${activeReport.title}`} size="sm">
        <div className="space-y-4">
          <p className="text-[13px] text-ims-slate">
            {t.exportDialogDescription}
          </p>
          <div className="flex justify-center rounded-xl border border-ims-slate/10 bg-ims-cream/25 p-2 overflow-x-auto">
            <Calendar
              mode="range"
              selected={exportDateRange}
              onSelect={(r) => setExportDateRange(r || { from: undefined, to: undefined })}
              numberOfMonths={1}
              className="bg-transparent border-none p-0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={isExporting} onClick={() => setIsExportModalOpen(false)}>{t.cancel}</Button>
          <Button
            disabled={isExporting}
            onClick={handleExport}
            className="bg-ims-blue text-white hover:bg-ims-navy"
          >
            {isExporting ? t.processing : `${t.download} ${exportType.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </Dialog>

    </div>
  )
}

export default ReportPage
