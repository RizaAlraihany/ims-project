import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bell,
  Building2,
  Check,
  Database,
  HardDrive,
  KeyRound,
  Languages,
  Mail,
  Plus,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle,
  UsersRound,
} from 'lucide-react'
import { rolesApi } from '@/api/roles'
import { settingsApi } from '@/api/settings'
import { usersApi } from '@/api/users'
import { MetricCard, OperationsChartGrid } from '@/components/analytics/OperationalCharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerFooter } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import { apiErrorMessage } from '@/utils/apiError'

const sections = [
  {
    group: 'Akun',
    items: [
      { id: 'profile', icon: UserCircle, labelKey: 'profile' },
      { id: 'general', icon: SlidersHorizontal, labelKey: 'settingsGeneral' },
      { id: 'users', icon: UsersRound, labelKey: 'userManagement' },
      { id: 'roles', icon: ShieldCheck, labelKey: 'rolePermission' },
    ],
  },
  {
    group: 'Sistem',
    items: [
      { id: 'company', icon: Building2, labelKey: 'settingsCompany' },
      { id: 'inventory', icon: Database, labelKey: 'settingsInventory' },
      { id: 'notification', icon: Bell, labelKey: 'settingsNotification' },
      { id: 'security', icon: ShieldCheck, labelKey: 'settingsSecurity' },
      { id: 'backup', icon: HardDrive, labelKey: 'settingsBackup' },
      { id: 'api', icon: KeyRound, labelKey: 'settingsApi' },
    ],
  },
]

const sectionItems = sections.flatMap((section) => section.items)
const sectionIds = sectionItems.map((item) => item.id)

const descriptions = {
  profile: 'Identitas akun aktif, role, dan status akses pengguna.',
  general: 'Bahasa antarmuka, nama aplikasi, timezone, dan preferensi dasar.',
  users: 'Kelola user, status akun, dan role operasional.',
  roles: 'Atur permission operasional untuk setiap role.',
  company: 'Identitas perusahaan untuk laporan dan dokumen operasional.',
  inventory: 'Aturan stok, metode biaya, dan notifikasi stok minimum.',
  notification: 'Pengaturan notifikasi email, low stock, dan transfer.',
  security: 'Session timeout, kebijakan password, dan keamanan akun.',
  backup: 'Jadwal backup dan retensi data sistem.',
  api: 'Rate limit, webhook, dan rotasi token integrasi.',
}

const languageOptions = [
  { value: 'id', labelKey: 'indonesian', descriptionKey: 'indonesianOptionDescription' },
  { value: 'en', labelKey: 'english', descriptionKey: 'englishOptionDescription' },
]

const settingGroups = {
  general: [
    ['app.name', 'Application Name', 'IMS Pro'],
    ['app.timezone', 'Timezone', 'Asia/Jakarta'],
    ['app.default_language', 'Default Language', 'id'],
  ],
  company: [
    ['company.name', 'Company Name', 'IMS Multi-Gudang'],
    ['company.email', 'Company Email', 'ops@example.com'],
    ['company.phone', 'Company Phone', '-'],
  ],
  inventory: [
    ['inventory.cost_method', 'Cost Method', 'FIFO'],
    ['inventory.low_stock_alert', 'Low Stock Alert', 'enabled'],
    ['inventory.allow_negative_stock', 'Allow Negative Stock', 'disabled'],
  ],
  notification: [
    ['notification.email', 'Email Notification', 'enabled'],
    ['notification.low_stock', 'Low Stock Notification', 'enabled'],
    ['notification.transfer', 'Transfer Notification', 'enabled'],
  ],
  security: [
    ['security.session_timeout_minutes', 'Session Timeout Minutes', '120'],
    ['security.password_min_length', 'Password Minimum Length', '8'],
    ['security.force_2fa', 'Force 2FA', 'disabled'],
  ],
  backup: [
    ['backup.enabled', 'Backup Enabled', 'disabled'],
    ['backup.schedule', 'Backup Schedule', 'daily'],
    ['backup.retention_days', 'Retention Days', '30'],
  ],
  api: [
    ['api.rate_limit_per_minute', 'Rate Limit / Minute', '60'],
    ['api.webhook_url', 'Webhook URL', ''],
    ['api.token_rotation_days', 'Token Rotation Days', '90'],
  ],
}

const initialUserForm = {
  role_id: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  is_active: true,
}

function SettingsPage() {
  const { language, setLanguage, t } = useLanguage()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [settings, setSettings] = useState({})
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')

  const requestedSection = searchParams.get('section') ?? 'profile'
  const activeSection = sectionIds.includes(requestedSection) ? requestedSection : 'profile'
  const activeItem = sectionItems.find((item) => item.id === activeSection) ?? sectionItems[0]
  const ActiveIcon = activeItem.icon

  const roleName = typeof user?.role === 'string'
    ? user.role
    : user?.role?.name ?? user?.role_name ?? '-'
  const displayName = user?.name ?? '-'
  const displayEmail = user?.email ?? '-'
  const settingsCount = Object.keys(settings).length

  useEffect(() => {
    let ignore = false

    async function loadBaseData() {
      try {
        const [roleResponse, permissionResponse, settingResponse] = await Promise.all([
          rolesApi.list(),
          rolesApi.permissions(),
          settingsApi.list(),
        ])

        if (ignore) return

        setRoles(roleResponse.data?.data ?? [])
        setPermissions(permissionResponse.data?.data ?? [])
        setSettings(Object.fromEntries((settingResponse.data?.data ?? []).map((item) => [item.key, item.value ?? ''])))
      } catch (error) {
        if (!ignore) setError(apiErrorMessage(error, 'Pengaturan belum dapat dimuat.'))
      }
    }

    loadBaseData()

    return () => {
      ignore = true
    }
  }, [])

  function selectSection(sectionId) {
    setSearchParams(sectionId === 'profile' ? {} : { section: sectionId })
    setError('')
    setStatusMessage('')
  }

  function setSettingValue(key, value) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  async function saveSettings(groupId) {
    setError('')
    setStatusMessage('')

    try {
      const payload = (settingGroups[groupId] ?? []).map(([key]) => ({
        key,
        value: settings[key] ?? '',
      }))
      const response = await settingsApi.update(payload)
      const updated = Object.fromEntries((response.data?.data ?? []).map((item) => [item.key, item.value ?? '']))
      setSettings((current) => ({ ...current, ...updated }))
      setStatusMessage('Pengaturan berhasil diperbarui.')
    } catch (error) {
      setError(apiErrorMessage(error, 'Pengaturan gagal diperbarui.'))
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-5 lg:border-r lg:border-ims-slate/10 lg:pr-5">
        <section className="border-b border-ims-slate/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ims-slate/20 bg-white text-sm font-black text-ims-navy">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-ims-navy">{displayName}</p>
              <p className="truncate text-xs font-semibold text-ims-slate">{roleName}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-[11px] font-semibold text-ims-slate">
            <span><strong className="text-ims-navy">{t.active ?? 'Aktif'}</strong> status</span>
            <span><strong className="text-ims-navy">{roles.length}</strong> role</span>
          </div>
        </section>

        <section className="space-y-5">
          {sections.map((section) => (
            <div key={section.group}>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-ims-slate/80">{section.group}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = item.id === activeSection

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectSection(item.id)}
                      className={[
                        'flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                        isActive
                          ? 'border-ims-blue text-ims-navy'
                          : 'border-transparent text-ims-slate hover:text-ims-navy',
                      ].join(' ')}
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className="truncate">{t[item.labelKey] ?? item.id}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      </aside>

      <div className="min-w-0 space-y-6">
        <section className="rounded-3xl border border-ims-slate/20 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ims-slate/10 text-ims-blue">
                <ActiveIcon size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-ims-slate">{t.systemSettings}</p>
                <h2 className="mt-1 text-lg font-black text-ims-navy">{t[activeItem.labelKey] ?? activeSection}</h2>
                <p className="mt-1 text-sm leading-5 text-ims-slate">{descriptions[activeSection]}</p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit border-ims-slate/20 px-3 py-1 text-[11px] font-black text-ims-slate">
              IMS Pro
            </Badge>
          </div>
        </section>

        {error ? (
          <div className="rounded-[10px] border border-ims-danger/20 bg-ims-danger/10 p-3 text-sm text-ims-danger">
            {error}
          </div>
        ) : null}
        {statusMessage ? (
          <div className="rounded-[10px] border border-ims-success/20 bg-ims-success/5 p-3 text-sm font-semibold text-ims-success">
            {statusMessage}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={UsersRound} label={t.rolePermission} value={roles.length.toLocaleString('en-US')} helper={t.role} tone="blue" />
          <MetricCard icon={ShieldCheck} label="Permission" value={permissions.length.toLocaleString('en-US')} helper={t.systemSettings} tone="navy" />
          <MetricCard icon={Database} label="Settings" value={settingsCount.toLocaleString('en-US')} helper={t.settingsGeneral} tone="success" />
          <MetricCard icon={ActiveIcon} label={t[activeItem.labelKey] ?? activeSection} value="1" helper={descriptions[activeSection]} tone="warning" />
        </section>

        <OperationsChartGrid
          bar={{
            title: t.systemSettings,
            subtitle: descriptions[activeSection],
            labels: ['Role', 'Permission', 'Settings'],
            emptyText: 'Pengaturan belum dapat dimuat.',
            series: [{ label: 'Total', values: [roles.length, permissions.length, settingsCount], className: 'bg-ims-blue' }],
          }}
          donut={{
            title: 'Settings Mix',
            subtitle: t[activeItem.labelKey] ?? activeSection,
            centerLabel: 'Data',
            centerValue: (roles.length + permissions.length + settingsCount).toLocaleString('en-US'),
            emptyText: 'Pengaturan belum dapat dimuat.',
            items: [
              { label: 'Role', value: roles.length, color: '#4B5694', displayValue: roles.length.toLocaleString('en-US') },
              { label: 'Permission', value: permissions.length, color: '#7288AE', displayValue: permissions.length.toLocaleString('en-US') },
              { label: 'Settings', value: settingsCount, color: '#047857', displayValue: settingsCount.toLocaleString('en-US') },
            ],
          }}
        />

        {activeSection === 'profile' ? (
          <ProfileSection displayEmail={displayEmail} displayName={displayName} roleName={roleName} t={t} />
        ) : null}

        {activeSection === 'general' ? (
          <div className="space-y-6">
            <LanguageSection language={language} setLanguage={setLanguage} t={t} />
            <SettingsEditor
              description={descriptions.general}
              groupId="general"
              icon={SlidersHorizontal}
              onChange={setSettingValue}
              onSave={saveSettings}
              settings={settings}
              title={t.settingsGeneral}
            />
          </div>
        ) : null}

        {['company', 'inventory', 'notification', 'security', 'backup', 'api'].includes(activeSection) ? (
          <SettingsEditor
            description={descriptions[activeSection]}
            groupId={activeSection}
            icon={ActiveIcon}
            onChange={setSettingValue}
            onSave={saveSettings}
            settings={settings}
            title={t[activeItem.labelKey] ?? activeSection}
          />
        ) : null}

        {activeSection === 'users' ? (
          <UserManagementSection onError={setError} onStatusMessage={setStatusMessage} roles={roles} />
        ) : null}

        {activeSection === 'roles' ? (
          <RolePermissionSection
            onError={setError}
            onStatusMessage={setStatusMessage}
            permissions={permissions}
            roles={roles}
            setRoles={setRoles}
          />
        ) : null}
      </div>
    </div>
  )
}

function ProfileSection({ displayName, displayEmail, roleName, t }) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-ims-slate/20 bg-white p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-ims-slate/20 bg-white text-xl font-black text-ims-navy">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-black text-ims-navy">{displayName}</h2>
                <Badge variant="outline" className="border-none bg-ims-success/10 px-2.5 py-1 text-[10px] font-black text-ims-success">
                  {t.active}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-ims-slate">
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={14} />
                  {displayEmail}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  {roleName}
                </span>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ims-slate">{t.profileDescription}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:min-w-[280px]">
            <ProfileMetric label={t.role} value={roleName} />
            <ProfileMetric label={t.email} value={t.verified} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <InfoPanel
          icon={ShieldCheck}
          rows={[
            [t.activeSession, t.activeSessionDescription],
            [t.switchAccount, t.switchAccountDescription],
          ]}
          title={t.accountSecurity}
        />
        <InfoPanel
          icon={Bell}
          rows={[
            [t.notifications, t.notificationPreferenceDescription],
            [t.localPreferences, t.localPreferencesDescription],
          ]}
          title={t.appPreferences}
        />
      </section>
    </div>
  )
}

function LanguageSection({ language, setLanguage, t }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-ims-slate/20 bg-white">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ims-slate/10 text-ims-navy">
            <Languages size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-ims-navy">{t.languageSettings}</h3>
            <p className="mt-1 text-sm text-ims-slate">{t.languageDescription}</p>
          </div>
        </div>
        <div className="w-full sm:w-[220px]">
          <Select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="id">{t.indonesian}</option>
            <option value="en">{t.english}</option>
          </Select>
        </div>
      </div>

      <div className="mt-5 grid gap-0 divide-y divide-ims-slate/10 border-y border-ims-slate/10 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        {languageOptions.map((option) => {
          const isActive = language === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setLanguage(option.value)}
              className={[
                'flex items-start justify-between gap-4 p-4 text-left transition-colors',
                isActive
                  ? 'text-ims-navy'
                  : 'text-ims-slate hover:text-ims-navy',
              ].join(' ')}
            >
              <div>
                <p className="text-sm font-black text-ims-navy">{t[option.labelKey]}</p>
                <p className="mt-1 text-xs leading-5 text-ims-slate">{t[option.descriptionKey]}</p>
              </div>
              {isActive ? (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ims-success text-white">
                  <Check size={15} />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function SettingsEditor({ description, groupId, icon: Icon, onChange, onSave, settings, title }) {
  const group = settingGroups[groupId] ?? []

  return (
    <section className="rounded-3xl border border-ims-slate/20 bg-white p-6">
      <div className="flex flex-col gap-4 border-b border-ims-slate/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ims-slate/10 text-ims-blue">
            <Icon size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-ims-navy">{title}</h3>
            <p className="mt-1 text-sm text-ims-slate">{description}</p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => onSave(groupId)}>
          <Save size={15} /> Simpan
        </Button>
      </div>
      <div className="mt-5 grid gap-x-8 gap-y-5 lg:grid-cols-2">
        {group.map(([key, label, fallback]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <Input id={key} value={settings[key] ?? fallback} onChange={(event) => onChange(key, event.target.value)} />
            <p className="font-mono text-[11px] text-ims-slate">{key}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function UserManagementSection({ roles, onError, onStatusMessage }) {
  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [roleId, setRoleId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(initialUserForm)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let ignore = false

    async function loadUsers() {
      setIsLoading(true)
      onError('')

      try {
        const response = await usersApi.list({
          page,
          per_page: 10,
          search: search || undefined,
          role_id: roleId || undefined,
          status: status || undefined,
        })

        if (ignore) return

        setUsers(response.data?.data ?? [])
        setMeta({
          current_page: response.data?.current_page ?? 1,
          last_page: response.data?.last_page ?? 1,
          total: response.data?.total ?? 0,
        })
      } catch (error) {
        if (!ignore) onError(apiErrorMessage(error, 'Data user belum dapat dimuat.'))
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    const timer = setTimeout(loadUsers, 250)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [onError, page, roleId, search, status])

  function openCreate() {
    setEditingUser(null)
    setForm({ ...initialUserForm, role_id: String(roles[0]?.id ?? '') })
    setDrawerOpen(true)
  }

  function openEdit(nextUser) {
    setEditingUser(nextUser)
    setForm({
      role_id: String(nextUser.role_id ?? nextUser.role?.id ?? nextUser.role_record?.id ?? ''),
      name: nextUser.name ?? '',
      email: nextUser.email ?? '',
      phone: nextUser.phone ?? '',
      password: '',
      is_active: Boolean(nextUser.is_active),
    })
    setDrawerOpen(true)
  }

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function reloadUsers() {
    const response = await usersApi.list({
      page,
      per_page: 10,
      search: search || undefined,
      role_id: roleId || undefined,
      status: status || undefined,
    })

    setUsers(response.data?.data ?? [])
    setMeta({
      current_page: response.data?.current_page ?? 1,
      last_page: response.data?.last_page ?? 1,
      total: response.data?.total ?? 0,
    })
  }

  async function saveUser(event) {
    event.preventDefault()
    setIsSaving(true)
    onError('')
    onStatusMessage('')

    try {
      const payload = {
        role_id: Number(form.role_id),
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        is_active: form.is_active,
      }

      if (form.password) payload.password = form.password

      if (editingUser) {
        await usersApi.update(editingUser.id, payload)
        onStatusMessage('User berhasil diperbarui.')
      } else {
        await usersApi.create({ ...payload, password: form.password })
        onStatusMessage('User berhasil dibuat.')
      }

      await reloadUsers()
      setDrawerOpen(false)
    } catch (error) {
      onError(apiErrorMessage(error, 'User gagal disimpan.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="border-b border-ims-slate/10 pb-6">
      <div className="flex flex-col gap-4 border-b border-ims-slate/10 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ims-slate/10 text-ims-blue">
            <UsersRound size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-ims-navy">User Management</h3>
            <p className="mt-1 text-sm text-ims-slate">Kelola user, status akun, dan role operasional.</p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus size={15} /> Tambah User
        </Button>
      </div>

      <div className="flex flex-col gap-3 border-b border-ims-slate/10 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-wrap gap-3">
          <div className="relative w-full sm:w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ims-slate/80" size={14} />
            <Input 
              className="h-10 border-ims-slate/20 bg-white pl-9 text-[13px]" 
              placeholder="Cari nama atau email..." 
              value={search} 
              onChange={(event) => { setSearch(event.target.value); setPage(1) }} 
            />
          </div>
          <Select className="w-full text-[13px] sm:w-[180px]" value={roleId} onChange={(event) => { setRoleId(event.target.value); setPage(1) }}>
            <option value="">Semua Role</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </Select>
          <Select className="w-full text-[13px] sm:w-[180px]" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto border-b border-ims-slate/10">
        <table className="min-w-full text-left text-sm">
          <thead className="ims-table-head border-b border-ims-slate/20">
            <tr>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Role</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ims-slate/10">
            {isLoading ? <tr><td className="px-5 py-8 text-center text-ims-slate" colSpan="4">Memuat user...</td></tr> : null}
            {!isLoading && users.length === 0 ? <tr><td className="px-5 py-8 text-center text-ims-slate" colSpan="4">Data user tidak ditemukan.</td></tr> : null}
            {users.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-ims-cream/25">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ims-slate/20 text-xs font-black text-ims-navy">
                      {(item.name ?? '?')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-ims-navy">{item.name}</p>
                      <p className="text-xs text-ims-slate">{item.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-ims-slate">{item.role?.name ?? item.role_record?.name ?? '-'}</td>
                <td className="px-5 py-4">
                  <Badge variant={item.is_active ? 'success' : 'outline'} className={item.is_active ? 'border-none bg-ims-success/10 text-ims-success' : ''}>
                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-right">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Info */}
      <div className="flex items-center justify-between border-t border-ims-slate/10 px-4 py-3 sm:px-6 sm:py-4">
        <div className="hidden text-[12px] font-medium text-ims-navy/80 sm:block">
          Menampilkan {meta.total === 0 ? 0 : ((page - 1) * 10) + 1} hingga {Math.min(page * 10, meta.total)} dari {meta.total.toLocaleString('en-US')} user
        </div>
        <div className="text-[12px] text-ims-navy/80 sm:hidden">
          {meta.total === 0 ? 0 : ((page - 1) * 10) + 1}-{Math.min(page * 10, meta.total)} / {meta.total}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ims-slate/20 text-ims-slate transition-colors hover:bg-ims-cream/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-[10px]">{'<'}</span>
          </button>
          <div className="hidden items-center gap-1 sm:flex">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-ims-blue text-[12px] font-bold text-white">
              {page}
            </button>
            {meta.last_page > page ? (
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[12px] font-semibold text-ims-navy/80 transition-colors hover:bg-ims-cream/25" onClick={() => setPage((value) => value + 1)}>
                {page + 1}
              </button>
            ) : null}
            {meta.last_page > page + 1 ? (
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[12px] font-semibold text-ims-navy/80 transition-colors hover:bg-ims-cream/25" onClick={() => setPage((value) => value + 2)}>
                {page + 2}
              </button>
            ) : null}
            {meta.last_page > page + 2 ? (
              <span className="flex h-8 w-8 items-center justify-center text-[12px] font-medium text-ims-slate/50">...</span>
            ) : null}
          </div>
          <button
            disabled={page >= meta.last_page}
            onClick={() => setPage((value) => value + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ims-slate/20 text-ims-slate transition-colors hover:bg-ims-cream/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-[10px]">{'>'}</span>
          </button>
        </div>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title={editingUser ? 'Edit User' : 'Tambah User'} description="Kelola identitas user dan role akses.">
        <form className="space-y-4" onSubmit={saveUser}>
          <Field label="Nama"><Input value={form.name} onChange={(event) => setField('name', event.target.value)} required /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} required /></Field>
          <Field label="Telepon"><Input value={form.phone} onChange={(event) => setField('phone', event.target.value)} /></Field>
          <Field label="Role">
            <Select value={form.role_id} onChange={(event) => setField('role_id', event.target.value)} required>
              <option value="">Pilih Role</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </Select>
          </Field>
          <Field label="Password">
            <Input type="password" value={form.password} onChange={(event) => setField('password', event.target.value)} required={!editingUser} placeholder={editingUser ? 'Kosongkan jika tidak diganti' : ''} />
          </Field>
          <label className="flex items-center gap-2 rounded-lg border border-ims-slate/10 bg-ims-cream/25 p-3 text-sm font-semibold text-ims-navy">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setField('is_active', event.target.checked)} />
            Akun aktif
          </label>
          <DrawerFooter className="-mx-6 -mb-6 mt-6">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={isSaving}>Simpan</Button>
          </DrawerFooter>
        </form>
      </Drawer>
    </section>
  )
}

function RolePermissionSection({ roles, setRoles, permissions, onError, onStatusMessage }) {
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === String(selectedRoleId)) ?? roles[0],
    [roles, selectedRoleId],
  )
  const effectivePermissionIds = selectedPermissionIds ?? (selectedRole?.permissions ?? []).map((permission) => permission.id)
  const permissionGroups = useMemo(() => {
    const groups = {}
    permissions.forEach((permission) => {
      const group = (permission.code ?? 'other').split('.')[0]
      groups[group] = [...(groups[group] ?? []), permission]
    })
    return Object.entries(groups)
  }, [permissions])

  function selectRole(roleId) {
    const nextRole = roles.find((role) => String(role.id) === String(roleId))
    setSelectedRoleId(roleId)
    setSelectedPermissionIds((nextRole?.permissions ?? []).map((permission) => permission.id))
  }

  function togglePermission(permissionId) {
    setSelectedPermissionIds((current) => {
      const ids = current ?? effectivePermissionIds
      return ids.includes(permissionId) ? ids.filter((id) => id !== permissionId) : [...ids, permissionId]
    })
  }

  async function savePermissions() {
    if (!selectedRole) return

    setIsSaving(true)
    onError('')
    onStatusMessage('')

    try {
      const response = await rolesApi.updatePermissions(selectedRole.id, effectivePermissionIds)
      const updatedRole = response.data?.data
      setRoles((current) => current.map((role) => (role.id === updatedRole.id ? { ...role, ...updatedRole } : role)))
      onStatusMessage('Permission role berhasil diperbarui.')
    } catch (error) {
      onError(apiErrorMessage(error, 'Permission role gagal diperbarui.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="border-b border-ims-slate/10 pb-6">
      <div className="flex flex-col gap-4 border-b border-ims-slate/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ims-slate/10 text-ims-blue">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-ims-navy">Role Permission</h3>
            <p className="mt-1 text-sm text-ims-slate">Atur permission operasional per role.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={String(selectedRole?.id ?? '')} onChange={(event) => selectRole(event.target.value)}>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </Select>
          <Button type="button" onClick={savePermissions} isLoading={isSaving}>
            <Save size={15} /> Simpan
          </Button>
        </div>
      </div>

      <div className="space-y-6 py-5">
        {permissionGroups.map(([group, groupPermissions]) => (
          <div key={group}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-ims-slate">{group}</p>
            <div className="divide-y divide-ims-slate/10 border-y border-ims-slate/10 lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {groupPermissions.map((permission) => {
                const checked = effectivePermissionIds.includes(permission.id)

                return (
                  <label key={permission.id} className={['flex items-start gap-3 p-3 transition-colors', checked ? 'text-ims-navy' : 'text-ims-slate hover:text-ims-navy'].join(' ')}>
                    <input type="checkbox" className="mt-1" checked={checked} onChange={() => togglePermission(permission.id)} />
                    <span>
                      <span className="block text-sm font-black text-ims-navy">{permission.name}</span>
                      <span className="font-mono text-[11px] text-ims-slate">{permission.code}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Field({ children, label }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ProfileMetric({ label, value }) {
  return (
    <div className="border-l-2 border-ims-slate/20 pl-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-ims-slate">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-ims-navy">{value}</p>
    </div>
  )
}

function InfoPanel({ icon: Icon, rows, title }) {
  return (
    <div className="border-t border-ims-slate/10 pt-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ims-slate/10 text-ims-blue">
          <Icon size={18} />
        </div>
        <h3 className="text-sm font-black text-ims-navy">{title}</h3>
      </div>
      <div className="mt-4 divide-y divide-ims-slate/10 border-y border-ims-slate/10">
        {rows.map(([label, value]) => (
          <div key={label} className="py-3">
            <p className="text-xs font-black text-ims-navy">{label}</p>
            <p className="mt-1 text-[11px] leading-5 text-ims-slate">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function getInitials(name) {
  if (!name || name === '-') return <UserCircle size={34} />

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export default SettingsPage
