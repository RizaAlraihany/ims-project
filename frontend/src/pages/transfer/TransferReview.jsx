import { Link, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Check, PackageCheck, Send, Truck } from 'lucide-react'
import { transfersApi } from '@/api/transfers'
import { MetricCard, OperationsChartGrid } from '@/components/analytics/OperationalCharts'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/hooks/useLanguage'
import { clearTransferDraft, getTransferDraft } from '@/store/transferDraft'
import { apiErrorMessage } from '@/utils/apiError'

const steps = ['Gudang', 'Barang', 'Jumlah', 'Review']

function TransferReview() {
  const { t } = useLanguage()
  const [draft] = useState(getTransferDraft)
  const [isVerified, setIsVerified] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (!draft) {
    return <Navigate to="/transfer/create" replace />
  }

  const item = draft.items[0]
  const totalQuantity = draft.items.reduce((sum, currentItem) => sum + Number(currentItem.quantity ?? 0), 0)
  const availableQty = Number(item.available ?? 0)
  const remainingQty = Math.max(0, availableQty - Number(item.quantity ?? 0))

  async function handleConfirm() {
    setIsSubmitting(true)
    setError('')
    setMessage('')

    try {
      const response = await transfersApi.create({
        source_warehouse_id: draft.source_warehouse_id,
        dest_warehouse_id: draft.dest_warehouse_id,
        items: draft.items.map(({ product_id, quantity }) => ({ product_id, quantity })),
      })

      clearTransferDraft()
      setMessage(`Transfer ${response.data.data.transfer_no} berhasil dibuat dan menunggu approval.`)
    } catch (error) {
      setError(apiErrorMessage(error, 'Transfer gagal diproses.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ims-slate">{t.transfer}</p>
          <h2 className="text-2xl font-bold text-ims-navy">{t.transferMutationTitle}</h2>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/transfer">{t.cancel}</Link>
        </Button>
      </section>

      {/* Stepper */}
      <div className="flex items-center justify-between rounded-3xl border border-ims-slate/20 bg-white p-4">
        {steps.map((step, index) => (
          <div key={step} className="flex flex-col items-center gap-2 lg:flex-1 lg:flex-row">
            <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black shadow-sm ${index === 3 ? 'bg-ims-navy text-white shadow-ims-navy/20' : 'bg-ims-navy text-white'}`}>
              {index < 3 ? <Check size={14} /> : index + 1}
            </div>
            <span className={`text-[10px] font-bold uppercase lg:text-xs text-ims-navy`}>
              {step}
            </span>
            {index < steps.length - 1 ? <span className="hidden h-px flex-1 bg-ims-navy lg:block" /> : null}
          </div>
        ))}
      </div>

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Truck} label={t.sourceWarehouse} value={draft.sourceWarehouse.code ?? '-'} helper={draft.sourceWarehouse.name} tone="blue" />
        <MetricCard icon={Truck} label={t.destinationWarehouse} value={draft.destinationWarehouse.code ?? '-'} helper={draft.destinationWarehouse.name} tone="navy" />
        <MetricCard icon={PackageCheck} label={t.items} value={draft.items.length.toLocaleString('en-US')} helper={t.product} tone="success" />
        <MetricCard icon={Send} label={t.transferQuantity} value={totalQuantity.toLocaleString('en-US')} helper={`${t.remaining}: ${remainingQty.toLocaleString('en-US')}`} tone="warning" />
      </section>

      <OperationsChartGrid
        bar={{
          title: t.confirmTransfer,
          subtitle: t.confirmTransferDescription,
          labels: draft.items.slice(0, 6).map((currentItem) => currentItem.product?.sku ?? currentItem.product?.name ?? t.product),
          emptyText: t.noDataActiveFilters,
          series: [{ label: t.transferQuantity, values: draft.items.slice(0, 6).map((currentItem) => Number(currentItem.quantity ?? 0)), className: 'bg-ims-blue' }],
        }}
        donut={{
          title: `${t.transfer} Mix`,
          subtitle: t.verifyTransfer,
          centerLabel: t.qty,
          centerValue: totalQuantity.toLocaleString('en-US'),
          emptyText: t.noDataActiveFilters,
          items: [
            { label: t.transferQuantity, value: totalQuantity, color: '#D97706', displayValue: totalQuantity.toLocaleString('en-US') },
            { label: t.remaining, value: remainingQty, color: '#047857', displayValue: remainingQty.toLocaleString('en-US') },
          ],
        }}
      />

      {/* Summary Container */}
      <div className="rounded-3xl border border-ims-slate/20 bg-white">
        <div className="border-b border-ims-slate/20 p-5">
          <h3 className="text-sm font-bold text-ims-navy">{t.confirmTransfer}</h3>
          <p className="mt-1 text-xs text-ims-slate">
            {t.confirmTransferDescription}
          </p>
        </div>

        <div className="p-5">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ims-slate">{t.sourceWarehouse}</p>
              <p className="mt-2 text-sm font-black text-ims-navy">{draft.sourceWarehouse.name}</p>
            </div>
            <div className="rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ims-slate">{t.destinationWarehouse}</p>
              <p className="mt-2 text-sm font-black text-ims-navy">{draft.destinationWarehouse.name}</p>
            </div>
          </div>

          <div className="my-6 h-px w-full bg-ims-slate/20" />

          <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
            <div className="rounded-lg border border-ims-slate/20 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ims-slate">{t.product}</p>
              <p className="mt-2 text-base font-black text-ims-navy">{item.product?.name}</p>
              <p className="mt-1 font-mono text-[11px] font-bold text-ims-slate">SKU: {item.product?.sku}</p>
            </div>
            <div className="rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-4 sm:min-w-[150px]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ims-slate">{t.transferQuantity}</p>
              <p className="mt-1 font-mono text-3xl font-black text-ims-navy">{item.quantity}</p>
            </div>
          </div>

          <div className="my-6 h-px w-full bg-ims-slate/20" />

          <div className="flex flex-col items-center justify-between gap-6 border-ims-slate/20 sm:flex-row">
            <label className="flex items-start gap-3 text-xs font-semibold text-ims-navy">
              <input 
                className="mt-0.5 h-4 w-4 rounded border-ims-slate/50 text-ims-navy shadow-sm focus:ring-ims-navy" 
                type="checkbox" 
                checked={isVerified} 
                onChange={(event) => setIsVerified(event.target.checked)} 
                disabled={Boolean(message) || isSubmitting}
              />
              <span>
                {t.verifyTransfer}
                <span className="block mt-1 font-normal text-ims-slate">{t.verifyTransferDescription}</span>
              </span>
            </label>

            <div className="flex w-full gap-2 sm:w-auto">
              <Button type="button" variant="ghost" asChild disabled={Boolean(message) || isSubmitting}>
                <Link to="/transfer/create"><ArrowLeft size={16} className="mr-2" /> {t.back}</Link>
              </Button>
              <Button 
                className="flex-1 sm:flex-none" 
                disabled={!isVerified || Boolean(message)} 
                isLoading={isSubmitting}
                onClick={handleConfirm}
              >
                {isSubmitting ? t.processing : (
                  <>{t.createDraft} <Send size={16} className="ml-2" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransferReview
