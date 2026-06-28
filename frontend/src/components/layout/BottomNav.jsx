import { Boxes, Database, Home, Repeat2, ScanLine } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useLanguage } from '@/hooks/useLanguage'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/utils/cn'

const navItems = [
  { to: '/', labelKey: 'home', icon: Home, permissions: ['dashboard.view'] },
  { to: '/inventory', labelKey: 'items', icon: Boxes, permissions: ['inventory.view'] },
  { to: '/scanner', labelKey: 'scanner', icon: ScanLine, permissions: ['product.view'] },
  { to: '/transfer', labelKey: 'transfer', icon: Repeat2, permissions: ['transfer.view'] },
  { to: '/master', labelKey: 'master', icon: Database, permissions: ['product.view', 'warehouse.view'] },
]

function BottomNav() {
  const { t } = useLanguage()
  const { hasAnyPermission } = usePermissions()
  const visibleItems = navItems.filter((item) => hasAnyPermission(item.permissions))

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ims-slate/20 bg-white px-3 py-2 shadow-lg lg:hidden">
      <div
        className="mx-auto grid max-w-md gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.max(visibleItems.length, 1)}, minmax(0, 1fr))` }}
      >
        {visibleItems.map(({ icon: Icon, labelKey, to }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={t[labelKey]}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold uppercase text-ims-slate transition-all',
                isActive && 'bg-ims-cream/60 text-ims-navy',
              )
            }
          >
            <Icon size={18} />
            {t[labelKey]}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav
