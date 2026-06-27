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
import { apiErrorMessage } from '@/utils/apiError'

function StockOpnameCreate() {
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
        if (!ignore) setError(apiErrorMessage(error, 'Data gudang belum dapat dimuat.'))
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadWarehouses()

    return () => {
      ignore = true
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!warehouseId) {
      setError('Pilih gudang sebelum membuat session opname.')
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
      setError(apiErrorMessage(error, 'Session stock opname gagal dibuat.'))
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
            <p className="text-[11px] font-bold uppercase tracking-wide text-ims-slate">Stock Opname</p>
            <h2 className="text-xl font-bold text-ims-navy lg:text-2xl">Buat Session Baru</h2>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[10px] border border-ims-danger/20 bg-ims-danger/10 p-3 text-sm text-ims-danger">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardCheck} label="Session Baru" value="1" helper="Snapshot stok" tone="blue" />
        <MetricCard icon={Building2} label="Gudang" value={warehouses.length.toLocaleString('en-US')} helper="Lokasi tersedia" tone="navy" />
        <MetricCard icon={Building2} label="Gudang Dipilih" value={warehouseId ? '1' : '0'} helper="Siap dibuat" tone="success" />
        <MetricCard icon={ClipboardCheck} label="Status" value={isLoading ? '...' : 'Draft'} helper="Tahap awal" tone="warning" />
      </section>

      <OperationsChartGrid
        bar={{
          title: 'Kesiapan Stock Opname',
          subtitle: 'Gudang tersedia untuk dibuatkan snapshot',
          labels: warehouses.slice(0, 6).map((warehouse) => warehouse.code ?? warehouse.name),
          emptyText: isLoading ? 'Memuat gudang...' : 'Tidak ada gudang',
          series: [{ label: 'Gudang', values: warehouses.slice(0, 6).map(() => 1), className: 'bg-ims-blue' }],
        }}
        donut={{
          title: 'Session Mix',
          subtitle: 'Status pembuatan session',
          centerLabel: 'Session',
          centerValue: warehouseId ? '1' : '0',
          emptyText: isLoading ? 'Memuat gudang...' : 'Pilih gudang',
          items: [
            { label: 'Dipilih', value: warehouseId ? 1 : 0, color: '#047857', displayValue: warehouseId ? '1' : '0' },
            { label: 'Belum dipilih', value: warehouseId ? 0 : 1, color: '#D97706', displayValue: warehouseId ? '0' : '1' },
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
              <h3 className="text-sm font-bold text-ims-navy">Informasi Session</h3>
              <p className="mt-0.5 text-xs text-ims-slate">
                {isLoading ? 'Memuat gudang...' : 'Pilih gudang yang akan dihitung fisiknya.'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="warehouse_id" className="text-xs font-bold text-ims-navy">
                Lokasi Gudang <span className="text-ims-danger">*</span>
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
                Snapshot stok (system qty) akan diambil secara otomatis berdasarkan stok saat session dibuat.
              </p>
            </div>
            
            <div className="border-t border-ims-slate/10 pt-6">
              <Button 
                type="submit" 
                className="w-full sm:w-auto px-8" 
                isLoading={isSubmitting}
                disabled={isLoading}
              >
                {isSubmitting ? 'Membuat Session...' : 'Buat Session Opname'}
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
        title="Buat Session Stock Opname"
        description="Snapshot stok akan disiapkan untuk dihitung secara fisik. Session ini tidak dapat dibatalkan setelah dibuat. Apakah Anda yakin?"
        confirmLabel="Ya, Buat Session"
      />
    </div>
  )
}

export default StockOpnameCreate
