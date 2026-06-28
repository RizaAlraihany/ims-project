import { Bell, Menu, Search } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { notificationsApi } from '@/api/notifications'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'
import { formatDate } from '@/utils/formatDate'

function getPageTitles(t) {
  return {
    '/': { title: t.dashboard, subtitle: t.dashboardSubtitle },
    '/master': { title: t.masterData, subtitle: t.masterSubtitle },
    '/inventory': { title: t.inventory, subtitle: t.inventorySubtitle },
    '/inventory/stock-card': { title: t.stockCard, subtitle: t.stockCardSubtitle },
    '/stock-in': { title: t.stockIn, subtitle: t.stockInSubtitle },
    '/stock-out': { title: t.stockOut, subtitle: t.stockOutSubtitle },
    '/scanner': { title: t.scanner, subtitle: t.scannerSubtitle },
    '/transfer': { title: t.transfers, subtitle: t.transferSubtitle },
    '/transfer/create': { title: t.createTransfer, subtitle: t.createTransferSubtitle },
    '/transfer/review': { title: t.reviewTransfer, subtitle: t.reviewTransferSubtitle },
    '/opname': { title: t.stockOpname, subtitle: t.stockOpnameSubtitle },
    '/opname/create': { title: t.newStockOpname, subtitle: t.newStockOpnameSubtitle },
    '/reports': { title: t.reports, subtitle: t.reportsSubtitle },
    '/audit': { title: t.auditTrail, subtitle: t.auditSubtitle },
    '/settings': { title: t.settings, subtitle: t.settingsSubtitle },
  }
}

function getPageInfo(pathname, search, t) {
  const pageTitles = getPageTitles(t)
  const query = new URLSearchParams(search)
  if (pathname === '/master' && (query.get('tab') ?? 'products') === 'products') {
    return { title: t.products, subtitle: t.productDirectoryDescription }
  }
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/transfer/')) return { title: t.transferDetail, subtitle: t.transferDetailSubtitle };
  if (pathname.startsWith('/opname/')) return { title: t.opnameDetail, subtitle: t.opnameDetailSubtitle };
  return { title: 'IMS Pro', subtitle: t.systemFallback };
}

function TopHeader({ onMobileMenuToggle }) {
  const location = useLocation()
  const { user } = useAuth()
  const { t } = useLanguage()
  const pageInfo = getPageInfo(location.pathname, location.search, t)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationError, setNotificationError] = useState('')
  const [isNotificationLoading, setIsNotificationLoading] = useState(false)

  const loadNotifications = useCallback(async () => {
    setIsNotificationLoading(true)
    setNotificationError('')

    try {
      const response = await notificationsApi.list({ per_page: 6 })
      const payload = response.data?.data ?? {}
      setNotifications(payload.items ?? [])
      setUnreadCount(payload.summary?.unread_count ?? 0)
    } catch (error) {
      setNotificationError(apiErrorMessage(error, t.notificationsUnavailable ?? 'Notifications could not be loaded.'))
    } finally {
      setIsNotificationLoading(false)
    }
  }, [t])

  async function toggleNotifications() {
    const nextOpen = !isNotificationOpen
    setIsNotificationOpen(nextOpen)

    if (nextOpen) {
      await loadNotifications()
    }
  }

  async function markAsRead(notificationId) {
    try {
      await notificationsApi.markAsRead(notificationId)
      await loadNotifications()
    } catch (error) {
      setNotificationError(apiErrorMessage(error, t.notificationReadFailed ?? 'Could not mark notification as read.'))
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-[102px] w-full shrink-0 items-center justify-between border-b border-ims-slate/20 bg-white px-5 md:px-10">
      <div className="flex w-full items-center justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Button
            size="icon"
            type="button"
            variant="outline"
            className="flex size-12 items-center justify-center rounded-2xl border border-ims-slate/20 bg-white text-ims-navy shadow-none transition-all duration-300 hover:border-ims-blue lg:hidden"
            aria-label={t.openMenu ?? 'Open menu'}
            onClick={onMobileMenuToggle}
          >
            <Menu className="size-6 text-ims-navy" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-[28px] font-black leading-8 text-ims-navy">{pageInfo.title}</h1>
            <p className="mt-1 truncate text-[15px] font-medium leading-5 text-ims-navy/90">{pageInfo.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {user?.role ? (
            <div className="hidden min-w-0 rounded-full border border-ims-slate/20 bg-ims-cream/50 px-3 py-2 text-right sm:block">
              <p className="max-w-[140px] truncate text-[10px] font-black uppercase leading-none text-ims-slate">{user.role}</p>
              <p className="mt-1 max-w-[140px] truncate text-xs font-bold leading-none text-ims-navy">{user.name}</p>
            </div>
          ) : null}
          <div
            className="hidden h-[51px] w-[288px] cursor-not-allowed items-center gap-3 rounded-2xl border border-ims-slate/10 bg-ims-slate/10 px-5 text-ims-slate/70 md:flex"
            aria-disabled="true"
            title={t.searchComingSoon}
          >
            <Search className="size-6 shrink-0" />
            <span className="truncate text-[15px] font-semibold text-ims-navy/70">{t.searchComingSoon}</span>
          </div>
          <div className="relative">
            <Button
              size="icon"
              type="button"
              variant="outline"
              className="relative size-[52px] rounded-full border border-ims-slate/20 bg-white text-ims-slate shadow-none transition-all duration-300 hover:border-ims-blue hover:bg-white"
              aria-label={t.notifications}
              aria-expanded={isNotificationOpen}
              onClick={toggleNotifications}
            >
              <Bell className="size-6 text-ims-slate" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-ims-danger px-1 text-[9px] font-black text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Button>
            {isNotificationOpen ? (
              <div className="absolute right-0 top-12 z-40 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-ims-slate/20 bg-white shadow-xl shadow-ims-navy/10">
                <div className="flex items-center justify-between border-b border-ims-slate/20 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-ims-slate">{t.notifications}</p>
                    <p className="text-sm font-black text-ims-navy">{unreadCount} {t.unreadAlert}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[11px] font-bold text-ims-slate"
                    onClick={loadNotifications}
                  >
                    {t.refresh}
                  </Button>
                </div>
                {notificationError ? <p className="m-3 rounded-lg border border-ims-danger/20 bg-ims-danger/10 p-2 text-xs text-ims-danger">{notificationError}</p> : null}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-xs text-ims-slate">{isNotificationLoading ? t.loadingNotifications : t.noNotifications}</p>
                  ) : null}
                  {notifications.map((notification) => (
                    <article key={notification.id} className="border-b border-ims-slate/20 p-3 last:border-b-0 hover:bg-ims-cream/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-ims-navy">{notification.title}</p>
                          <p className="mt-1 text-[11px] leading-4 text-ims-slate">{notification.message}</p>
                          <p className="mt-2 text-[10px] font-semibold text-ims-slate">{formatDate(notification.created_at)}</p>
                        </div>
                        {!notification.is_read ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 h-7 px-2 text-[10px]"
                            onClick={() => markAsRead(notification.id)}
                          >
                            {t.read}
                          </Button>
                        ) : (
                          <span className="shrink-0 rounded-md bg-ims-cream px-2 py-1 text-[10px] font-bold text-ims-slate">{t.read}</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopHeader
