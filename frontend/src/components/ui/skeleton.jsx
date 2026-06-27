import { cn } from '@/utils/cn'

/**
 * Skeleton — animated shimmer placeholder untuk loading state.
 * Gunakan sebagai pengganti text/data saat menunggu API response.
 */
function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('skeleton rounded-md bg-ims-cream/40', className)}
      {...props}
    />
  )
}

/**
 * TableSkeleton — skeleton untuk tabel data.
 * rows: jumlah baris yang ditampilkan (default 5)
 * cols: jumlah kolom (default 5)
 */
function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="border-b border-ims-slate/20 bg-ims-cream/25 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" style={{ maxWidth: i === 0 ? '80px' : undefined }} />
          ))}
        </div>
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-ims-slate/20 px-4 py-3.5 last:border-b-0">
          <div className="flex items-center gap-4">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn('h-3.5 flex-1', colIndex === 0 && 'max-w-[64px]')}
                style={{
                  opacity: 1 - rowIndex * 0.12,
                  maxWidth: colIndex === cols - 1 ? '80px' : undefined,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * CardSkeleton — skeleton untuk card layout (mobile).
 * count: jumlah card yang ditampilkan (default 4)
 */
function CardSkeleton({ count = 4 }) {
  return (
    <div className="divide-y divide-ims-slate/20">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 p-4" style={{ opacity: 1 - i * 0.18 }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 flex-1 rounded-md" />
            <Skeleton className="h-7 flex-1 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * KpiSkeleton — skeleton untuk KPI metric cards (dashboard).
 * count: jumlah card (default 4)
 */
function KpiSkeleton({ count = 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-2 lg:grid-cols-${count} lg:gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-ims-slate/20 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="mt-5 h-7 w-24" />
        </div>
      ))}
    </div>
  )
}

/**
 * ListSkeleton — skeleton untuk list item sederhana (low stock, transfer pending, activities).
 * count: jumlah item (default 3)
 */
function ListSkeleton({ count = 3 }) {
  return (
    <div className="divide-y divide-ims-slate/20">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-3" style={{ opacity: 1 - i * 0.2 }}>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, TableSkeleton, CardSkeleton, KpiSkeleton, ListSkeleton }
