import {
  Boxes, Building2, Calendar, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardCheck, FileText, Filter, History, Home, Layers3,
  PackageMinus, PackagePlus, PackageSearch, Repeat2,
  Ruler, Settings, TrendingUp, UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from '@/components/layout/BottomNav'
import TopHeader from '@/components/layout/TopHeader'
import { useLanguage } from '@/hooks/useLanguage'
import { cn } from '@/utils/cn'

const navGroups = [
  {
    titleKey: 'analytics',
    items: [
      { to: '/', labelKey: 'dashboard', icon: Home },
      { 
        to: '/reports?type=stocks', 
        labelKey: 'reporting', 
        icon: FileText,
        children: [
          { to: '/reports?type=movements', labelKey: 'movement', icon: TrendingUp },
          { to: '/reports?type=transfers', labelKey: 'transfer', icon: Filter },
          { to: '/reports?type=opnames', labelKey: 'opname', icon: Calendar },
        ]
      },
      { to: '/audit', labelKey: 'auditTrail', icon: History },
    ],
  },
  {
    titleKey: 'masterDataGroup',
    items: [
      {
        to: '/master?tab=products',
        labelKey: 'dataBarang',
        icon: Boxes,
        children: [
          { to: '/master?tab=categories', labelKey: 'categories', icon: Layers3 },
          { to: '/master?tab=units', labelKey: 'units', icon: Ruler },
        ],
      },
      { 
        to: '/master?tab=warehouses', 
        labelKey: 'dataGudang', 
        icon: Building2,
        children: [
          { to: '/transfer', labelKey: 'transferStock', icon: Repeat2 },
        ]
      },
      { to: '/master?tab=contacts', labelKey: 'dataKontak', icon: UsersRound },
    ],
  },
  {
    titleKey: 'stockManagement',
    items: [
      { 
        to: '/inventory', 
        labelKey: 'inventory', 
        icon: Boxes,
        children: [
          { to: '/inventory/stock-card', labelKey: 'stockCard', icon: Layers3 },
          { to: '/stock-in', labelKey: 'stockIn', icon: PackagePlus },
          { to: '/stock-out', labelKey: 'stockOut', icon: PackageMinus },
        ]
      },
      { to: '/opname', labelKey: 'stockOpname', icon: ClipboardCheck },
    ],
  },
  {
    titleKey: 'settingsGroup',
    items: [
      { to: '/settings', labelKey: 'systemSettings', icon: Settings },
    ],
  },
]

const primaryNavGroups = navGroups.filter((g) => g.titleKey !== 'settingsGroup')
const systemNavGroup = navGroups.find((g) => g.titleKey === 'settingsGroup')

function CollapsibleNavItem({ item, isOpen: sidebarOpen, t }) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUrl = `${location.pathname}${location.search}`

  function matchesTo(to) {
    if (currentUrl === to) return true
    if (to.includes('?')) {
      const [toPath] = to.split('?')
      if (location.pathname === toPath && !location.search) return true
    }
    return false
  }

  const selfActive = matchesTo(item.to)
  const anyChildActive = item.children?.some((child) => matchesTo(child.to)) ?? false

  const [isExpanded, setIsExpanded] = useState(selfActive || anyChildActive)

  function handleParentClick() {
    if (!sidebarOpen) return
    if (anyChildActive) {
      navigate(item.to)
      return
    }
    setIsExpanded((v) => !v)
    if (!isExpanded) navigate(item.to)
  }

  function handleChildClick(e, child) {
    if (matchesTo(child.to)) {
      e.preventDefault()
      navigate(item.to)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleParentClick}
        title={!sidebarOpen ? t[item.labelKey] ?? item.labelKey : undefined}
        className={cn(
          'flex w-full items-center rounded-xl py-3 text-sm font-semibold transition-all duration-200',
          sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0',
          selfActive
            ? 'bg-ims-blue/10 text-ims-blue ring-1 ring-ims-slate/20'
            : anyChildActive
              ? 'text-ims-blue'
              : 'text-ims-slate hover:bg-ims-cream/35 hover:text-ims-navy',
        )}
      >
        <item.icon size={18} className="shrink-0" />
        {sidebarOpen && (
          <>
            <span className="flex-1 whitespace-nowrap text-left">
              {t[item.labelKey] ?? item.labelKey}
            </span>
            <ChevronDown
              size={13}
              className={cn(
                'shrink-0 transition-transform duration-200',
                isExpanded ? 'rotate-180' : 'rotate-0',
              )}
            />
          </>
        )}
      </button>

      {sidebarOpen && (
        <div
          className="overflow-hidden transition-all duration-200 ease-in-out"
          style={{
            maxHeight: isExpanded ? `${(item.children?.length ?? 0) * 40}px` : '0px',
            opacity: isExpanded ? 1 : 0,
          }}
        >
          <div className="pb-1 pt-1">
            {item.children?.map((child) => {
              const childActive = matchesTo(child.to)
              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  onClick={(e) => handleChildClick(e, child)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg py-2 pl-8 pr-3 text-[12px] font-semibold transition-colors',
                    childActive
                      ? 'bg-ims-cream/40 text-ims-navy'
                      : 'text-ims-slate/70 hover:bg-ims-cream/30 hover:text-ims-navy',
                  )}
                >
                  {child.icon ? (
                    <child.icon size={14} className={cn("shrink-0", childActive ? 'text-ims-blue' : 'text-ims-slate/50')} />
                  ) : (
                    <span className={cn(
                      'h-1 w-1 shrink-0 rounded-full transition-colors',
                      childActive ? 'bg-ims-blue' : 'bg-ims-slate/40',
                    )} />
                  )}
                  <span className="whitespace-nowrap">{t[child.labelKey] ?? child.labelKey}</span>
                </NavLink>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


function SidebarGroup({ group, isOpen, t, showTitle = true }) {
  const location = useLocation()
  const currentUrl = `${location.pathname}${location.search}`

  function isItemActive(to) {
    if (to.includes('?')) return currentUrl === to
    if (to === '/') return location.pathname === '/'
    return location.pathname === to || location.pathname.startsWith(`${to}/`)
  }

  return (
    <div>
      {showTitle && isOpen ? (
        <h2 className="mb-3 px-2 text-[10px] font-bold uppercase tracking-wider text-ims-slate/80">
          {t[group.titleKey]}
        </h2>
      ) : showTitle ? (
        <div className="mb-2 h-4" />
      ) : null}

      <div className="space-y-1">
        {group.items.map((item) => {
          if (item.children?.length) {
            return (
              <CollapsibleNavItem
                key={item.to}
                item={item}
                isOpen={isOpen}
                t={t}
              />
            )
          }

          const active = isItemActive(item.to)
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={!isOpen ? t[item.labelKey] : undefined}
              className={() =>
                cn(
                  'flex items-center rounded-xl py-3 text-sm font-semibold transition-all duration-200',
                  isOpen ? 'gap-3 px-4' : 'justify-center px-0',
                  active
                    ? 'bg-ims-blue/10 text-ims-blue ring-1 ring-ims-slate/20'
                    : 'text-ims-slate hover:bg-ims-cream/35 hover:text-ims-navy',
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              {isOpen && (
                <span className="whitespace-nowrap">{t[item.labelKey] ?? item.labelKey}</span>
              )}
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}

function DesktopSidebar({ isOpen, onToggle, isMobile }) {
  const { t } = useLanguage()

  return (
    <aside
      className={cn(
        'relative z-30 min-h-full flex-col border-r border-ims-slate/20 bg-white py-0 transition-all duration-300',
        !isMobile && 'hidden lg:flex',
        isMobile && 'flex w-[280px]',
        !isMobile && isOpen ? 'w-[280px]' : !isMobile && 'w-[88px] items-center',
      )}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-8 z-10 grid h-7 w-7 place-items-center rounded-full border border-ims-slate/20 bg-white text-ims-slate shadow-sm hover:border-ims-blue/50 hover:text-ims-navy"
        aria-label="Toggle Sidebar"
      >
        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Logo */}
      <div className={cn('flex h-[90px] items-center border-b border-ims-slate/20 px-5', isOpen ? 'gap-3' : 'justify-center px-3')}>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ims-blue text-white shadow-sm shadow-ims-blue/20">
          <PackageSearch size={22} />
        </div>
        {isOpen && (
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="text-xl font-black tracking-tight text-ims-navy">IMS Pro</h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ims-slate">{t.enterpriseInventory}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex min-h-0 w-full flex-1 flex-col overflow-hidden', isOpen ? 'p-5' : 'px-2 py-5')}>
        <div className="sidebar-scroll min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden pr-1">
          {primaryNavGroups.map((group) => (
            <SidebarGroup key={group.titleKey} group={group} isOpen={isOpen} t={t} />
          ))}
        </div>
        {systemNavGroup ? (
          <div className="shrink-0 border-t border-ims-slate/20 pt-4">
            <SidebarGroup group={systemNavGroup} isOpen={isOpen} t={t} />
          </div>
        ) : null}
      </nav>
    </aside>
  )
}

function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <div className="min-h-svh bg-white text-ims-navy">
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-[280px] bg-white shadow-xl">
            <DesktopSidebar isOpen={true} onToggle={() => setIsMobileSidebarOpen(false)} isMobile={true} />
          </div>
        </div>
      )}

      <div
        className={cn(
          'relative min-h-svh bg-white transition-[grid-template-columns] duration-300 lg:grid lg:h-svh lg:w-full lg:overflow-hidden',
          isSidebarOpen
            ? 'lg:grid-cols-[280px_minmax(0,1fr)]'
            : 'lg:grid-cols-[88px_minmax(0,1fr)]',
        )}
      >
        <DesktopSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((v) => !v)} />
        <div className="flex min-h-svh min-w-0 flex-col bg-ims-cream/35 lg:min-h-0">
          <TopHeader onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
          <main className="ims-page flex-1 px-4 pb-24 pt-4 lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:pb-8 lg:pt-6">
            <Outlet />
          </main>
        </div>
        <BottomNav />
      </div>
    </div>
  )
}

export default MainLayout
