import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { Dialog } from '@/components/ui/dialog'
import AuthProvider from '@/hooks/AuthProvider'
import LanguageProvider from '@/hooks/LanguageProvider'
import { useLanguage } from '@/hooks/useLanguage'

const MainLayout = lazy(() => import('@/components/layout/MainLayout'))
const AuditTrailPage = lazy(() => import('@/pages/audit/AuditTrailPage'))
const Login = lazy(() => import('@/pages/auth/Login'))
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'))
const InventoryList = lazy(() => import('@/pages/inventory/InventoryList'))
const StockCard = lazy(() => import('@/pages/inventory/StockCard'))
const StockMovementForm = lazy(() => import('@/pages/inventory/StockMovementForm'))
const MasterData = lazy(() => import('@/pages/master/MasterData'))
const StockMovementList = lazy(() => import('@/pages/inventory/StockMovementList'))
const StockOpnameCreate = lazy(() => import('@/pages/opname/StockOpnameCreate'))
const StockOpnameDetail = lazy(() => import('@/pages/opname/StockOpnameDetail'))
const StockOpnameList = lazy(() => import('@/pages/opname/StockOpnameList'))
const ReportPage = lazy(() => import('@/pages/report/ReportPage'))
const ScannerView = lazy(() => import('@/pages/scanner/ScannerView'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))
const TransferDetail = lazy(() => import('@/pages/transfer/TransferDetail'))
const TransferForm = lazy(() => import('@/pages/transfer/TransferForm'))
const TransferList = lazy(() => import('@/pages/transfer/TransferList'))
const TransferReview = lazy(() => import('@/pages/transfer/TransferReview'))

function RouteLoader() {
  return (
    <div className="grid min-h-svh place-items-center bg-ims-cream px-4 text-sm font-bold text-ims-navy">
      Memuat halaman...
    </div>
  )
}

function StockMovementModalRoute({ mode, returnTo = '/inventory' }) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const isStockIn = mode === 'in'

  return (
    <Dialog
      open
      onClose={() => navigate(returnTo)}
      title={isStockIn ? t.inputStockIn : t.inputStockOut}
      size="xl"
      className="max-w-5xl"
    >
      <StockMovementForm mode={mode} isModal />
    </Dialog>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="/master" element={<MasterData />} />
                <Route path="/inventory" element={<InventoryList />} />
                <Route path="/inventory/stock-card" element={<StockCard />} />
                <Route path="/stock-in" element={<StockMovementList key="in" mode="in" />} />
                <Route path="/stock-in/create" element={<StockMovementModalRoute mode="in" returnTo="/stock-in" />} />
                <Route path="/stock-out" element={<StockMovementList key="out" mode="out" />} />
                <Route path="/stock-out/create" element={<StockMovementModalRoute mode="out" returnTo="/stock-out" />} />
                <Route path="/scanner" element={<ScannerView />} />
                <Route path="/transfer" element={<TransferList />} />
                <Route path="/transfer/create" element={<TransferForm />} />
                <Route path="/transfer/review" element={<TransferReview />} />
                <Route path="/transfer/:id" element={<TransferDetail />} />
                <Route path="/opname" element={<StockOpnameList />} />
                <Route path="/opname/create" element={<StockOpnameCreate />} />
                <Route path="/opname/:id" element={<StockOpnameDetail />} />
                <Route path="/reports" element={<ReportPage />} />
                <Route path="/audit" element={<AuditTrailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
