import { Boxes, Database, Home, Repeat2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useLanguage } from '@/hooks/useLanguage'
import { cn } from '@/utils/cn'

const navItems = [
  { to: '/', labelKey: 'home', icon: Home },
  { to: '/master', labelKey: 'master', icon: Database },
  { to: '/inventory', labelKey: 'items', icon: Boxes },
  { to: '/transfer', labelKey: 'transfer', icon: Repeat2 },
]

function BottomNav() {
  const { t } = useLanguage()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ims-slate/20 bg-white px-3 py-2 shadow-lg lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {navItems.map(({ icon: Icon, labelKey, to }) => (
          <NavLink
            key={to}
            to={to}
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
