import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, PackageCheck, Truck, XCircle } from 'lucide-react'
import { transfersApi } from '@/api/transfers'
import { MetricCard, OperationsChartGrid } from '@/components/analytics/OperationalCharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'

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
    DRAFT: t.draft,
    APPROVED: t.approved,
    IN_TRANSIT: t.inTransit,
    RECEIVED: t.received,
    COMPLETED: t.completed,
    REJECTED: t.rejected,
  }[status] ?? status
}

const lifecycleSteps = ['DRAFT', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED']

function lifecycleIndex(status) {
  const index = lifecycleSteps.indexOf(status)
  return index === -1 ? 0 : index
}

function TransferDetail() {
  const { t } = useLanguage()
  const { id } = useParams()
  const [transfer, setTransfer] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadTransfer() {
      setIsLoading(true)
      setError('')

      try {
        const response = await transfersApi.show(id)
        if (!ignore) setTransfer(response.data?.data ?? null)
      } catch (error) {
        if (!ignore) setError(apiErrorMessage(error, 'Detail transfer belum dapat dimuat.'))
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadTransfer()

    return () => {
      ignore = true
    }
  }, [id])

  async function runAction(action, successMessage) {
    setIsActionLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await transfersApi[action](id)
      setTransfer(response.data?.data ?? null)
      setMessage(successMessage)
    } catch (error) {
      setError(apiErrorMessage(error, 'Aksi transfer gagal diproses.'))
    } finally {
      setIsActionLoading(false)
    }
  }

  const transferItems = transfer?.items ?? []
  const totalQuantity = transferItems.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
  const currentStep = transfer ? lifecycleIndex(transfer.status) + 1 : 0
  const isCompleted = ['RECEIVED', 'COMPLETED'].includes(transfer?.status)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-lg">
            <Link to="/transfer"><ArrowLeft size={16} /></Link>
          </Button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-ims-slate">{t.transferDetail}</p>
            <h2 className="text-xl font-bold text-ims-navy lg:text-2xl">{transfer?.transfer_no ?? t.loading}</h2>
          </div>
        </div>
        {transfer ? (
          <Badge 
            variant={statusVariant(transfer.status)} 
            className={`px-3 py-1 text-xs ${['RECEIVED', 'COMPLETED'].includes(transfer.status) ? 'border-ims-success/30 text-ims-success' : ''}`}
          >
            {statusLabel(transfer.status, t)}
          </Badge>
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Truck} label={t.workflow} value={`${currentStep}/${lifecycleSteps.length}`} helper={transfer?.status ? statusLabel(transfer.status, t) : t.loading} tone="blue" />
        <MetricCard icon={PackageCheck} label={t.items} value={transferItems.length.toLocaleString('en-US')} helper={t.productName} tone="navy" />
        <MetricCard icon={PackageCheck} label={t.transferQuantity} value={totalQuantity.toLocaleString('en-US')} helper={t.qty} tone="warning" />
        <MetricCard icon={CheckCircle2} label={t.completed} value={isCompleted ? '1' : '0'} helper={t.transfer} tone="success" />
      </section>

      <OperationsChartGrid
        bar={{
          title: t.transferDetail,
          subtitle: transfer?.transfer_no ?? t.loading,
          labels: transferItems.slice(0, 6).map((item) => item.product?.sku ?? item.product?.name ?? t.productName),
          emptyText: isLoading ? t.loading : t.noDataActiveFilters,
          series: [{ label: t.transferQuantity, values: transferItems.slice(0, 6).map((item) => Number(item.quantity ?? 0)), className: 'bg-ims-blue' }],
        }}
        donut={{
          title: `${t.transfer} Mix`,
          subtitle: t.workflow,
          centerLabel: t.items,
          centerValue: transferItems.length.toLocaleString('en-US'),
          emptyText: isLoading ? t.loading : t.noDataActiveFilters,
          items: [
            { label: t.completed, value: isCompleted ? 1 : 0, color: '#047857', displayValue: isCompleted ? '1' : '0' },
            { label: t.inTransit, value: transfer?.status === 'IN_TRANSIT' ? 1 : 0, color: '#D97706', displayValue: transfer?.status === 'IN_TRANSIT' ? '1' : '0' },
            { label: t.draft, value: transfer?.status === 'DRAFT' ? 1 : 0, color: '#4B5694', displayValue: transfer?.status === 'DRAFT' ? '1' : '0' },
          ],
        }}
      />

      <div className="rounded-3xl border border-ims-slate/20 bg-white">
        <div className="border-b border-ims-slate/20 p-5">
          <h3 className="text-sm font-bold text-ims-navy">{t.transferInfo}</h3>
        </div>
        
        <div className="p-5">
          {isLoading ? (
            <p className="py-4 text-center text-sm text-ims-slate">{t.loading}</p>
          ) : transfer ? (
            <div className="space-y-6">
              {/* Warehouses Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ims-slate">{t.sourceWarehouse}</p>
                  <p className="mt-2 text-sm font-black text-ims-navy">{transfer.source_warehouse?.code}</p>
                  <p className="text-xs text-ims-slate">{transfer.source_warehouse?.name}</p>
                </div>
                <div className="rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ims-slate">{t.destinationWarehouse}</p>
                  <p className="mt-2 text-sm font-black text-ims-navy">{transfer.destination_warehouse?.code}</p>
                  <p className="text-xs text-ims-slate">{transfer.destination_warehouse?.name}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-ims-slate/20 bg-ims-cream/25 p-4">
                <p className="mb-4 text-[10px] font-bold uppercase tracking-wide text-ims-slate">{t.workflow}</p>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  {lifecycleSteps.map((step, index) => {
                    const isDone = transfer.status !== 'REJECTED' && index <= lifecycleIndex(transfer.status)
                    const isCurrent = transfer.status === step

                    return (
                      <div key={step} className="flex flex-1 items-center gap-3">
                        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${isDone ? 'bg-ims-navy text-white' : 'bg-white text-ims-slate'}`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-black ${isCurrent ? 'text-ims-navy' : 'text-ims-slate'}`}>{statusLabel(step, t)}</p>
                        </div>
                        {index < lifecycleSteps.length - 1 ? <div className="hidden h-px flex-1 bg-ims-slate/20 lg:block" /> : null}
                      </div>
                    )
                  })}
                </div>
                {transfer.status === 'REJECTED' ? (
                  <p className="mt-3 text-xs font-semibold text-ims-danger">{t.transferRejectedMessage}</p>
                ) : null}
              </div>

              {/* Items Table */}
              <div className="overflow-hidden rounded-lg border border-ims-slate/20">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-ims-slate/20 bg-ims-cream/25 text-xs font-semibold text-ims-slate">
                    <tr>
                      <th className="px-4 py-3">{t.productName}</th>
                      <th className="px-4 py-3 text-right">{t.transferQuantity}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ims-slate/10">
                    {(transfer.items ?? []).map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-ims-cream/25">
                        <td className="px-4 py-3">
                          <p className="font-bold text-ims-navy">{item.product?.name}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-ims-slate">SKU: {item.product?.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-base font-black text-ims-navy">
                            {Number(item.quantity ?? 0).toLocaleString('en-US')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              {['DRAFT', 'APPROVED', 'IN_TRANSIT', 'RECEIVED'].includes(transfer.status) && (
                <div className="mt-6 flex flex-wrap gap-3 border-t border-ims-slate/20 pt-6">
                  {transfer.status === 'DRAFT' && (
                    <>
                      <Button 
                        disabled={isActionLoading} 
                        onClick={() => runAction('approve', t.transferApprovedMessage)}
                        className="bg-ims-navy hover:bg-ims-navy/90"
                      >
                        <CheckCircle2 size={16} className="mr-2" /> {t.approveTransfer}
                      </Button>
                      <Button 
                        disabled={isActionLoading} 
                        variant="outline" 
                        onClick={() => runAction('reject', t.transferRejectedMessage)}
                        className="border-ims-danger/20 text-ims-danger hover:bg-ims-danger/10 hover:text-ims-danger"
                      >
                        <XCircle size={16} className="mr-2" /> {t.reject}
                      </Button>
                    </>
                  )}
                  {transfer.status === 'APPROVED' && (
                    <>
                      <Button 
                        disabled={isActionLoading} 
                        onClick={() => runAction('transit', t.transferInTransitMessage)}
                      >
                        <Truck size={16} className="mr-2" /> {t.markInTransit}
                      </Button>
                      <Button 
                        disabled={isActionLoading} 
                        onClick={() => runAction('receive', t.transferReceivedMessage)}
                        className="bg-ims-success hover:bg-ims-success/90"
                      >
                        <PackageCheck size={16} className="mr-2" /> {t.receiveItems}
                      </Button>
                    </>
                  )}
                  {transfer.status === 'IN_TRANSIT' && (
                    <Button 
                      disabled={isActionLoading} 
                      onClick={() => runAction('receive', t.transferReceivedMessage)}
                      className="bg-ims-success hover:bg-ims-success/90"
                    >
                      <PackageCheck size={16} className="mr-2" /> {t.receiveItems}
                    </Button>
                  )}
                  {transfer.status === 'RECEIVED' && (
                    <Button 
                      disabled={isActionLoading} 
                      onClick={() => runAction('complete', t.transferCompletedMessage)}
                      className="bg-ims-success hover:bg-ims-success/90"
                    >
                      <CheckCircle2 size={16} className="mr-2" /> {t.completeTransfer}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-ims-danger">Gagal memuat transfer.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default TransferDetail
