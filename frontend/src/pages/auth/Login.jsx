import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PackageSearch, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'

function Login() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const from = '/'
  const [form, setForm] = useState({
    email: 'admin@ims.test',
    password: 'password',
    device_name: 'ims-frontend',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(form)
      navigate(from, { replace: true })
    } catch (error) {
      setError(error.response?.data?.message ?? 'Login gagal. Periksa koneksi API.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  return (
    <div className="relative grid min-h-svh place-items-center bg-ims-cream/40 p-4 lg:p-8">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[60%] w-[40%] rounded-full bg-ims-blue/10 blur-[100px]" />
        <div className="absolute -bottom-[20%] -left-[10%] h-[60%] w-[40%] rounded-full bg-ims-navy/5 blur-[100px]" />
      </div>

      <Card className="relative z-10 w-full max-w-sm overflow-hidden rounded-[2rem] border-ims-slate/20 bg-white shadow-2xl shadow-ims-navy/10 lg:grid lg:max-w-6xl lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col justify-center bg-white p-8 lg:p-14">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-10">
              <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-ims-navy text-white shadow-lg shadow-ims-navy/20">
                <PackageSearch size={28} />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-ims-navy">{t.loginTitle}</h1>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ims-slate/80">{t.loginDescription}</p>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-ims-slate">Email</Label>
                <Input
                  id="email"
                  className="h-12 rounded-xl border-ims-slate/20 bg-ims-cream/20 px-4 text-[15px] font-medium transition-colors focus:border-ims-blue focus:bg-white focus:ring-ims-blue/20"
                  value={form.email}
                  onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-ims-slate">{t.password}</Label>
                <Input
                  id="password"
                  className="h-12 rounded-xl border-ims-slate/20 bg-ims-cream/20 px-4 text-[15px] font-medium transition-colors focus:border-ims-blue focus:bg-white focus:ring-ims-blue/20"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
                />
              </div>
              
              {error ? (
                <div className="rounded-xl border border-ims-danger/20 bg-ims-danger/10 p-3 text-sm font-medium text-ims-danger">
                  {error}
                </div>
              ) : null}
              
              <Button 
                className="h-12 w-full rounded-xl bg-ims-blue text-[15px] font-bold shadow-lg shadow-ims-blue/20 hover:bg-ims-navy transition-all active:scale-[0.98]" 
                isLoading={isSubmitting}
              >
                {isSubmitting ? t.processing : t.loginSubmit}
              </Button>
            </form>
          </div>
        </div>

        <div className="relative hidden bg-ims-navy p-4 lg:block">
          {/* Abstract geometric background */}
          <div className="absolute inset-0 overflow-hidden rounded-r-[1.5rem]">
            <div className="absolute -right-[20%] -top-[10%] h-[70%] w-[70%] rounded-full bg-ims-blue/30 blur-[120px]" />
            <div className="absolute -bottom-[20%] -left-[10%] h-[70%] w-[70%] rounded-full bg-indigo-500/20 blur-[120px]" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between rounded-[1.5rem] border border-white/10 bg-white/5 p-12 backdrop-blur-md shadow-2xl">
            <div className="mt-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-sm">
                <ShieldCheck size={28} />
              </div>
              <h2 className="mt-8 max-w-md text-4xl font-black leading-tight tracking-tight text-white">
                {t.loginHeroTitle}
              </h2>
              <p className="mt-5 max-w-sm text-base font-medium leading-relaxed text-white/70">
                {t.loginHeroDescription}
              </p>
            </div>
            
            <div className="mb-4 rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-md">
              <p className="text-xs font-black uppercase tracking-widest text-ims-light/90">
                {t.todaySnapshot}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 py-4 transition-colors hover:bg-white/20">
                  <p className="text-3xl font-black text-white">5</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-white/60">WH</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 py-4 transition-colors hover:bg-white/20">
                  <p className="text-3xl font-black text-white">42</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-white/60">SKU</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl bg-ims-warning/20 py-4 transition-colors hover:bg-ims-warning/30 border border-ims-warning/30">
                  <p className="text-3xl font-black text-ims-warning">8</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-ims-warning/80">{t.alert}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Login
