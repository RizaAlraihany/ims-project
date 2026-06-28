import { ArrowLeft, Building2, ClipboardCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { stockOpnamesApi } from '@/api/stockOpnames'
import { warehousesApi } from '@/api/warehouses'
import { MetricCard, OperationsChartGrid } from '@/components/analytics/OperationalCharts'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'

function StockOpnameCreate() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [warehouses, setWarehouses] = useState([])
  const [warehouseId, setWarehouseId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadWarehouses() {
      setIsLoading(true)
      setError('')

      try {
        const response = await warehousesApi.list({ per_page: 100 })
        const nextWarehouses = response.data?.data ?? []

        if (!ignore) {
          setWarehouses(nextWarehouses)
          setWarehouseId(String(nextWarehouses[0]?.id ?? ''))
        }
      } catch (error) {
        if (!ignore) setError(apiErrorMessage(error, t.warehousesUnavailable))
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadWarehouses()

    return () => {
      ignore = true
    }
  }, [t])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!warehouseId) {
      setError(t.selectWarehouseBeforeOpname)
      return
    }

    setConfirmOpen(true)
  }

  async function confirmCreate() {
    setConfirmOpen(false)
    setIsSubmitting(true)

    try {
      const response = await stockOpnamesApi.create({ warehouse_id: Number(warehouseId) })
      navigate(`/opname/${response.data?.data?.id}`)
    } catch (error) {
      setError(apiErrorMessage(error, t.dataSaveFailed))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-lg">
            <Link to="/opname"><ArrowLeft size={16} /></Link>
          </Button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-ims-slate">{t.stockOpname}</p>
            <h2 className="text-xl font-bold text-ims-navy lg:text-2xl">{t.createOpnameSession}</h2>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[10px] border border-ims-danger/20 bg-ims-danger/10 p-3 text-sm text-ims-danger">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardCheck} label={t.newSession} value="1" helper={t.stockSnapshot} tone="blue" />
        <MetricCard icon={Building2} label={t.warehouses} value={warehouses.length.toLocaleString('en-US')} helper={t.availableLocations} tone="navy" />
        <MetricCard icon={Building2} label={t.selectedWarehouse} value={warehouseId ? '1' : '0'} helper={t.readyToCreate} tone="success" />
        <MetricCard icon={ClipboardCheck} label={t.status} value={isLoading ? '...' : t.draft} helper={t.initialStep} tone="warning" />
      </section>

      <OperationsChartGrid
        bar={{
          title: t.stockOpnameReadiness,
          subtitle: t.stockOpnameReadinessSubtitle,
          labels: warehouses.slice(0, 6).map((warehouse) => warehouse.code ?? warehouse.name),
          emptyText: isLoading ? t.loading : t.noWarehouses,
          series: [{ label: t.warehouse, values: warehouses.slice(0, 6).map(() => 1), className: 'bg-ims-blue' }],
        }}
        donut={{
          title: t.sessionMix,
          subtitle: t.sessionMixSubtitle,
          centerLabel: t.newSession,
          centerValue: warehouseId ? '1' : '0',
          emptyText: isLoading ? t.loading : t.selectWarehouse,
          items: [
            { label: t.selected, value: warehouseId ? 1 : 0, color: '#047857', displayValue: warehouseId ? '1' : '0' },
            { label: t.notSelected, value: warehouseId ? 0 : 1, color: '#D97706', displayValue: warehouseId ? '0' : '1' },
          ],
        }}
      />

      {/* Main Form Container */}
      <div className="rounded-3xl border border-ims-slate/20 bg-white">
        <div className="border-b border-ims-slate/20 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-ims-blue/10 text-ims-blue">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ims-navy">{t.opnameInformation}</h3>
              <p className="mt-0.5 text-xs text-ims-slate">
                {isLoading ? t.loading : t.opnameInformationDescription}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="warehouse_id" className="text-xs font-bold text-ims-navy">
                {t.warehouseLocation} <span className="text-ims-danger">*</span>
              </Label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ims-slate" />
                <Select
                  id="warehouse_id"
                  value={warehouseId}
                  onChange={(event) => setWarehouseId(event.target.value)}
                  className="pl-10 h-11 bg-ims-cream/25 border-ims-slate/20"
                >
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>
                  ))}
                </Select>
              </div>
              <p className="text-[11px] text-ims-slate">
                {t.stockSnapshotNote}
              </p>
            </div>
            
            <div className="border-t border-ims-slate/10 pt-6">
              <Button 
                type="submit" 
                className="w-full sm:w-auto px-8" 
                isLoading={isSubmitting}
                disabled={isLoading}
              >
                {isSubmitting ? t.creatingSession : t.createOpnameSession}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmCreate}
        isLoading={isSubmitting}
        title={t.createOpnameSession}
        description={t.createOpnameDescription}
        confirmLabel={t.confirmCreateSession}
      />
    </div>
  )
}

export default StockOpnameCreate
