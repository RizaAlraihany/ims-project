import { ArrowLeft, CheckCircle2, Save, PackageCheck, AlertTriangle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { stockOpnamesApi } from '@/api/stockOpnames'
import { OperationsChartGrid } from '@/components/analytics/OperationalCharts'
import ScannerActionButton from '@/components/scanner/ScannerActionButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { apiErrorMessage } from '@/utils/apiError'

function statusVariant(status) {
  return {
    DRAFT: 'outline',
    COUNTING: 'warning',
    REVIEW: 'warning',
    APPROVED: 'success',
    ADJUSTED: 'success',
  }[status] ?? 'outline'
}

function StockOpnameDetail() {
  const { id } = useParams()
  const [opname, setOpname] = useState(null)
  const [counts, setCounts] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [savingProductId, setSavingProductId] = useState(null)
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadOpname() {
      setIsLoading(true)
      setError('')

      try {
        const response = await stockOpnamesApi.show(id)
        const nextOpname = response.data?.data ?? null

        if (!ignore) {
          setOpname(nextOpname)
          setCounts(Object.fromEntries((nextOpname?.items ?? []).map((item) => [item.product_id, Number(item.physical_qty ?? 0)])))
        }
      } catch (error) {
        if (!ignore) setError(apiErrorMessage(error, 'Detail stock opname belum dapat dimuat.'))
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadOpname()

    return () => {
      ignore = true
    }
  }, [id])

  const summary = useMemo(() => {
    const items = opname?.items ?? []

    return items.reduce((total, item) => {
      const physical = Number(counts[item.product_id] ?? item.physical_qty ?? 0)
      const system = Number(item.system_qty ?? 0)
      const difference = physical - system

      return {
        totalItems: total.totalItems + 1,
        plus: total.plus + (difference > 0 ? 1 : 0),
        minus: total.minus + (difference < 0 ? 1 : 0),
        unchanged: total.unchanged + (difference === 0 ? 1 : 0),
      }
    }, { totalItems: 0, plus: 0, minus: 0, unchanged: 0 })
  }, [counts, opname])

  const isLocked = ['APPROVED', 'ADJUSTED'].includes(opname?.status)
  
  // Progress Bar calculation (Items that have been touched vs total items)
  const progressPercentage = summary.totalItems > 0 
    ? Math.round(((summary.plus + summary.minus + summary.unchanged) / summary.totalItems) * 100)
    : 0
  const varianceValues = [summary.unchanged, summary.plus, summary.minus]

  function setPhysicalQty(productId, value) {
    setCounts((current) => ({ ...current, [productId]: value }))
  }

  async function saveItem(item) {
    setSavingProductId(item.product_id)
    setError('')
    setMessage('')

    try {
      const response = await stockOpnamesApi.saveItem(id, {
        product_id: item.product_id,
        physical_qty: Number(counts[item.product_id] ?? 0),
      })
      const updatedItem = response.data?.data

      setOpname((current) => ({
        ...current,
        status: current?.status === 'DRAFT' ? 'COUNTING' : current?.status,
        items: (current?.items ?? []).map((currentItem) => (currentItem.product_id === updatedItem.product_id ? { ...currentItem, ...updatedItem } : currentItem)),
      }))
      setMessage('Qty fisik berhasil disimpan.')
    } catch (error) {
      setError(apiErrorMessage(error, 'Qty fisik gagal disimpan.'))
    } finally {
      setSavingProductId(null)
    }
  }

  async function approveOpname() {
    setConfirmApproveOpen(true)
  }

  async function doApprove() {
    setConfirmApproveOpen(false)
    setIsActionLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await stockOpnamesApi.approve(id)
      const nextOpname = response.data?.data ?? null
      setOpname(nextOpname)
      setCounts(Object.fromEntries((nextOpname?.items ?? []).map((item) => [item.product_id, Number(item.physical_qty ?? 0)])))
      setMessage('Stock opname berhasil di-approve dan stok sudah disesuaikan.')
    } catch (error) {
      setError(apiErrorMessage(error, 'Approval stock opname gagal diproses.'))
    } finally {
      setIsActionLoading(false)
    }
  }

  function itemDifference(item) {
    return Number(counts[item.product_id] ?? 0) - Number(item.system_qty ?? 0)
  }

  function handleScannedProduct(product) {
    const item = (opname?.items ?? []).find((currentItem) => String(currentItem.product_id) === String(product.id))

    if (!item) {
      setError('Barang hasil pindai tidak ada dalam daftar opname gudang ini.')
      return
    }

    setError('')
    setMessage(`Barang ditemukan: ${product.sku} - ${product.name}`)
    window.setTimeout(() => {
      document.getElementById(`physical-${item.product_id}`)?.focus()
    }, 0)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-lg">
            <Link to="/opname"><ArrowLeft size={16} /></Link>
          </Button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-ims-slate">Stock Opname Detail</p>
            <h2 className="text-xl font-bold text-ims-navy lg:text-2xl">{opname?.opname_no ?? 'Memuat...'}</h2>
          </div>
        </div>
        {opname ? (
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-ims-slate">
              {opname.warehouse?.code} - {opname.warehouse?.name}
            </p>
            <div className="h-4 w-px bg-ims-slate/30" />
            <Badge 
              variant={statusVariant(opname.status)} 
              className={`px-3 py-1 text-xs ${['APPROVED', 'ADJUSTED'].includes(opname.status) ? 'border-ims-success/30 text-ims-success' : ''}`}
            >
              {opname.status}
            </Badge>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-[10px] border border-ims-danger/20 bg-ims-danger/10 p-3 text-sm text-ims-danger">
          {error}
        </div>
      ) : null}
      
      {message ? (
        <div className="rounded-[10px] border border-ims-success/20 bg-ims-success/5 p-3 text-sm text-ims-success">
          {message}
        </div>
      ) : null}

      {/* Metrics & Progress Box */}
      <div className="rounded-3xl border border-ims-slate/20 bg-white">
        <div className="border-b border-ims-slate/20 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-ims-navy">Opname Summary</h3>
              <p className="mt-0.5 text-xs text-ims-slate">Rangkuman hasil perhitungan fisik vs sistem</p>
            </div>
            {/* Progress Bar Container */}
            <div className="flex w-full flex-col gap-2 sm:max-w-xs">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-ims-slate">Progress Perhitungan</span>
                <span className="text-ims-navy">{progressPercentage}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ims-cream/40">
                <div 
                  className={`h-full ${progressPercentage === 100 ? 'bg-ims-success' : 'bg-ims-blue'} transition-all duration-500`} 
                  style={{ width: `${progressPercentage}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-ims-slate/10 sm:grid-cols-4 sm:divide-y-0">
          <div className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ims-slate">Total Items</p>
            <div className="mt-2 flex items-center gap-2">
              <PackageCheck size={20} className="text-ims-slate" />
              <p className="text-2xl font-black text-ims-navy">{summary.totalItems}</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ims-slate">Sesuai (Match)</p>
            <div className="mt-2 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-ims-slate/50" />
              <p className="text-2xl font-black text-ims-navy">{summary.unchanged}</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ims-success">Selisih Plus (+)</p>
            <p className="mt-2 text-2xl font-black text-ims-success">{summary.plus}</p>
          </div>
          <div className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ims-danger">Selisih Minus (-)</p>
            <p className="mt-2 text-2xl font-black text-ims-danger">{summary.minus}</p>
          </div>
        </div>
      </div>

      <OperationsChartGrid
        bar={{
          title: 'Grafik Selisih Opname',
          subtitle: opname?.warehouse ? `${opname.warehouse.code} - ${opname.warehouse.name}` : 'Memuat gudang...',
          labels: ['Sesuai', 'Plus', 'Minus'],
          emptyText: isLoading ? 'Memuat detail opname...' : 'Belum ada item inventory pada gudang ini.',
          series: [{ label: 'Item', values: varianceValues, className: 'bg-ims-blue' }],
        }}
        donut={{
          title: 'Opname Mix',
          subtitle: 'Distribusi hasil perhitungan',
          centerLabel: 'Item',
          centerValue: summary.totalItems.toLocaleString('en-US'),
          emptyText: isLoading ? 'Memuat detail opname...' : 'Belum ada item',
          items: [
            { label: 'Sesuai', value: summary.unchanged, color: '#4B5694', displayValue: summary.unchanged.toLocaleString('en-US') },
            { label: 'Plus', value: summary.plus, color: '#047857', displayValue: summary.plus.toLocaleString('en-US') },
            { label: 'Minus', value: summary.minus, color: '#B91C1C', displayValue: summary.minus.toLocaleString('en-US') },
          ],
        }}
      />

      {/* Main Table Container */}
      <div className="rounded-3xl border border-ims-slate/20 bg-white">
        <div className="border-b border-ims-slate/20 p-5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ims-navy">Daftar Barang & Perhitungan</h3>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isLocked ? <ScannerActionButton onProductFound={handleScannedProduct} /> : null}
            {!isLocked && (
              <Badge variant="outline" className="border-ims-warning/30 bg-ims-warning/10 text-ims-warning font-semibold">
                <AlertTriangle size={12} className="mr-1" />
                Mode Input
              </Badge>
            )}
          </div>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden overflow-hidden lg:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ims-slate/20 bg-ims-cream/25 text-xs font-semibold text-ims-slate">
              <tr>
                <th className="px-5 py-4">Product Info</th>
                <th className="px-5 py-4 text-center">System Qty</th>
                <th className="px-5 py-4 text-center">Physical Qty</th>
                <th className="px-5 py-4 text-center">Difference</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ims-slate/10">
              {isLoading ? <tr><td className="px-5 py-8 text-center text-ims-slate" colSpan="5">Memuat detail opname...</td></tr> : null}
              {!isLoading && (opname?.items ?? []).length === 0 ? <tr><td className="px-5 py-8 text-center text-ims-slate" colSpan="5">Belum ada item inventory pada gudang ini.</td></tr> : null}
              {(opname?.items ?? []).map((item) => {
                const difference = itemDifference(item)

                return (
                  <tr key={item.id} className="transition-colors hover:bg-ims-cream/25">
                    <td className="px-5 py-4">
                      <p className="font-bold text-ims-navy">{item.product?.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-ims-slate">SKU: {item.product?.sku}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="font-mono text-base font-bold text-ims-slate">
                        {Number(item.system_qty ?? 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center">
                        <Input 
                          id={`physical-${item.product_id}`}
                          className="h-10 w-[120px] font-mono text-base font-bold text-center border-ims-slate/30" 
                          disabled={isLocked} 
                          min="0" 
                          type="number" 
                          value={counts[item.product_id] ?? 0} 
                          onChange={(event) => setPhysicalQty(item.product_id, event.target.value)} 
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 font-mono text-sm font-black ${difference < 0 ? 'bg-ims-danger/10 text-ims-danger' : difference > 0 ? 'bg-ims-success/10 text-ims-success' : 'text-ims-slate'}`}>
                        {difference > 0 ? '+' : ''}{difference.toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button size="sm" variant="outline" disabled={isLocked || savingProductId === item.product_id} onClick={() => saveItem(item)}>
                        <Save size={14} className="mr-1" /> Simpan
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="divide-y divide-ims-slate/10 lg:hidden">
          {(opname?.items ?? []).map((item) => {
            const difference = itemDifference(item)

            return (
              <div key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ims-navy">{item.product?.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ims-slate">SKU: {item.product?.sku}</p>
                  </div>
                  <Badge variant={difference === 0 ? 'outline' : difference > 0 ? 'success' : 'destructive'} className="font-mono">
                    {difference > 0 ? '+' : ''}{difference}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-ims-cream/25 p-3 text-center border border-ims-slate/10">
                    <p className="text-[10px] font-bold uppercase text-ims-slate">System Qty</p>
                    <p className="mt-1 font-mono text-lg font-black text-ims-slate">{Number(item.system_qty ?? 0).toLocaleString('en-US')}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-center text-[10px] font-bold uppercase text-ims-slate">Physical Qty</p>
                    <Input 
                      id={`physical-${item.product_id}`}
                      className="h-10 text-center font-mono font-bold" 
                      disabled={isLocked} 
                      min="0" 
                      type="number" 
                      value={counts[item.product_id] ?? 0} 
                      onChange={(event) => setPhysicalQty(item.product_id, event.target.value)} 
                    />
                  </div>
                </div>
                <Button className="mt-4 w-full" size="sm" variant="outline" disabled={isLocked || savingProductId === item.product_id} onClick={() => saveItem(item)}>
                  <Save size={14} className="mr-1" /> Simpan Qty
                </Button>
              </div>
            )
          })}
        </div>

        {/* Action Footer */}
        <div className="border-t border-ims-slate/20 bg-ims-cream/25 p-5">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs font-semibold text-ims-slate">
              <span className="text-ims-danger font-bold">Perhatian:</span> Approval akan membuat movement OPNAME untuk setiap selisih stok.
            </p>
            <Button className="w-full sm:w-auto px-8" disabled={isLocked || isActionLoading || (opname?.items ?? []).length === 0} onClick={approveOpname}>
              <CheckCircle2 size={16} className="mr-2" /> Approve & Adjust
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmApproveOpen}
        onClose={() => setConfirmApproveOpen(false)}
        onConfirm={doApprove}
        isLoading={isActionLoading}
        title="Approve & Adjust Stock Opname"
        description="Approval akan membuat movement OPNAME untuk setiap item yang memiliki selisih stok. Tindakan ini tidak dapat dibatalkan dan akan langsung mempengaruhi stok sistem."
        confirmLabel="Ya, Approve & Adjust"
        variant="danger"
      />
    </div>
  )
}

export default StockOpnameDetail
