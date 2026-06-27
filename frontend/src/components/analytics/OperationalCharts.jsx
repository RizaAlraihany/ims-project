import { cn } from '@/utils/cn'

function safePercent(value, total) {
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((Number(value || 0) / total) * 100)))
}

export function ChartFilter({ period, onChange }) {
  const isWeekly = period === 'weekly'
  return (
    <div className="flex w-fit items-center gap-2 rounded-xl bg-ims-cream/40 p-1">
      <button 
        type="button" 
        onClick={() => onChange('weekly')}
        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${isWeekly ? 'bg-white font-bold text-ims-navy shadow-sm' : 'text-ims-slate hover:bg-white/50'}`}
      >
        Weekly
      </button>
      <button 
        type="button" 
        onClick={() => onChange('monthly')}
        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${!isWeekly ? 'bg-white font-bold text-ims-navy shadow-sm' : 'text-ims-slate hover:bg-white/50'}`}
      >
        Monthly
      </button>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, helper, tone = 'blue' }) {
  const toneClass = {
    blue: 'bg-ims-blue/10 text-ims-blue',
    navy: 'bg-ims-navy/10 text-ims-navy',
    success: 'bg-ims-success/10 text-ims-success',
    warning: 'bg-ims-warning/10 text-ims-warning',
    danger: 'bg-ims-danger/10 text-ims-danger',
  }[tone] ?? 'bg-ims-blue/10 text-ims-blue'

  const badgeClass = {
    blue: 'bg-ims-blue/10 text-ims-blue',
    navy: 'bg-ims-navy/10 text-ims-navy',
    success: 'bg-ims-success/10 text-ims-success',
    warning: 'bg-ims-warning/10 text-ims-warning',
    danger: 'bg-ims-danger/10 text-ims-danger',
  }[tone] ?? 'bg-ims-blue/10 text-ims-blue'

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-ims-slate/20 bg-white p-6 transition-shadow hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', toneClass)}>
          {Icon ? <Icon size={22} /> : null}
        </div>
        {helper ? (
          <span className={cn('rounded-full px-2 py-1 text-xs font-bold', badgeClass)}>
            {helper}
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-sm font-medium text-ims-slate">{label}</p>
        <p className="text-[32px] font-black leading-10 text-ims-navy">{value}</p>
      </div>
    </div>
  )
}

function OperationsChartGrid({ bar, donut }) {
  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <BarTrendPanel {...bar} />
      </div>
      <DonutPanel {...donut} />
    </section>
  )
}

function BarTrendPanel({ title, subtitle, action, labels = [], series = [], emptyText = 'No data' }) {
  const maxValue = Math.max(1, ...labels.flatMap((_, index) => series.map((item) => Number(item.values?.[index] || 0))))
  const hasData = series.some((item) => item.values?.some((value) => Number(value) > 0))

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-ims-slate/20 bg-white p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h3 className="text-lg font-bold text-ims-navy">{title}</h3>
          {subtitle ? <p className="text-sm text-ims-slate">{subtitle}</p> : null}
        </div>
        {action && <div>{action}</div>}
      </div>

      {!hasData ? (
        <div className="grid h-[300px] place-items-center rounded-2xl border border-dashed border-ims-slate/20 bg-ims-cream/25 text-sm font-medium text-ims-slate/80">
          {emptyText}
        </div>
      ) : (
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
                return (
                  <div key={`${label}-${index}`} className="relative flex h-full w-16 items-end justify-center gap-[2px]">
                    <span className="absolute -bottom-6 whitespace-nowrap text-[10px] font-medium text-ims-slate">{label}</span>
                    {series.map((item) => {
                      const value = Number(item.values?.[index] || 0)
                      const height = Math.max(value ? 8 : 1, Math.round((value / maxValue) * 100))
                      return (
                        <span
                          key={item.label}
                          title={`${item.label}: ${value.toLocaleString('en-US')}`}
                          className={cn('w-3 rounded-t-sm transition-all duration-300', item.className)}
                          style={{ height: `${height}%` }}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mt-0 flex flex-wrap items-center gap-4">
        {series.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs font-medium text-ims-slate">
            <span className={cn('size-[14px] rounded-full', item.className)} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutPanel({ title, subtitle, items = [], centerValue, centerLabel, emptyText = 'No data' }) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0)
  let cursor = 0
  const segments = items.map((item) => {
    const start = cursor
    const percent = safePercent(item.value, total)
    cursor += percent
    return `${item.color} ${start}% ${cursor}%`
  })
  const background = total ? `conic-gradient(${segments.join(', ')})` : 'rgba(114, 136, 174, 0.18)'

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-ims-slate/20 bg-white p-5 lg:p-6">
      <div>
        <h3 className="text-lg font-bold text-ims-navy">{title}</h3>
        {subtitle ? <p className="text-sm text-ims-slate">{subtitle}</p> : null}
      </div>

      <div className="grid place-items-center">
        {total ? (
          <div className="relative grid h-[200px] w-[200px] place-items-center rounded-full" style={{ background }}>
            <div className="grid h-[132px] w-[132px] place-items-center rounded-full bg-white text-center">
              <div>
                <p className="text-3xl font-black text-ims-navy">{centerValue ?? total.toLocaleString('en-US')}</p>
                <p className="text-xs font-semibold text-ims-slate">{centerLabel}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid h-[200px] w-full place-items-center rounded-2xl border border-dashed border-ims-slate/25 bg-ims-cream/25 text-sm font-semibold text-ims-slate">
            {emptyText}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="truncate font-medium text-ims-slate">{item.label}</span>
            </div>
            <span className="font-black text-ims-navy">{item.displayValue ?? safePercent(item.value, total) + '%'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { BarTrendPanel, DonutPanel, MetricCard, OperationsChartGrid }
