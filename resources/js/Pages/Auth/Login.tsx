import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  csrfToken: string
  lastEmail?: string
  error?: I18nMessage | null
}

export default function Login({ lastEmail, error }: Props) {
  const { t } = useTranslation()
  const [email, setEmail] = useState(lastEmail ?? '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    router.post('/login', { email, password }, {
      onFinish: () => setLoading(false),
    })
  }

  return (
    <AuthLayout>
      <Head title={t('ui.auth.login.title')} />
      <Card className="glass-card border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative group">
        {/* Optical Glow Effects */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary-neon/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary-neon/30 transition-all duration-1000" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent-electric/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-accent-electric/20 transition-all duration-1000" />
        
        <CardHeader className="text-center pt-12 pb-8 relative z-10">
          <CardTitle className="text-4xl font-heading font-black tracking-tighter mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-primary-neon drop-shadow-[0_0_20px_rgba(79,70,229,0.5)]">
              {t('ui.auth.login.title')}
            </span>
          </CardTitle>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-6 bg-primary-neon/30" />
            <CardDescription className="text-primary-neon/60 font-bold text-[10px] uppercase tracking-[0.2em]">
              {t('ui.auth.login.description')}
            </CardDescription>
            <div className="h-px w-6 bg-primary-neon/30" />
          </div>
        </CardHeader>
        
        <CardContent className="px-10 pb-12 relative z-10">
          <form onSubmit={handleSubmit} className="space-y-7">
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/50 backdrop-blur-xl px-4 py-3 text-sm text-red-200 animate-in shake-2 duration-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                  {t(error.key, error.params)}
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                {t('ui.auth.login.emailLabel')}
              </Label>
              <div className="relative group/input">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-primary-neon to-accent-electric rounded-xl opacity-20 group-focus-within/input:opacity-100 transition duration-500 blur-[2px]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="identity@draupnir.ai"
                  className="relative bg-[#020617]/80 border-white/10 focus:border-white/20 focus:ring-0 h-13 rounded-xl transition-all placeholder:text-slate-700 text-white font-medium text-base"
                  required
                  autoFocus
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  {t('ui.auth.login.passwordLabel')}
                </Label>
                <a href="/forgot-password" title={t('ui.auth.login.forgotPassword')} className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">
                  {t('ui.auth.login.forgotPassword')}
                </a>
              </div>
              <div className="relative group/input">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-primary-neon to-accent-electric rounded-xl opacity-20 group-focus-within/input:opacity-100 transition duration-500 blur-[2px]" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="relative bg-[#020617]/80 border-white/10 focus:border-white/20 focus:ring-0 h-13 rounded-xl transition-all text-white text-base"
                  required
                />
              </div>
            </div>
            
            <div className="pt-4 space-y-4">
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl font-black uppercase tracking-[0.15em] text-xs bg-gradient-to-r from-primary-neon via-primary-vibrant to-primary-neon bg-[length:200%_auto] hover:bg-right transition-all duration-500 shadow-[0_0_25px_rgba(79,70,229,0.3)] active:scale-[0.97] border border-white/10 text-white" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </div>
                ) : t('ui.auth.login.submitButton')}
              </Button>
              
              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <span className="relative bg-transparent px-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                  Secure OAuth
                </span>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.08] hover:text-slate-100 transition-all font-bold text-xs uppercase tracking-widest border-dashed"
                onClick={() => { window.location.href = '/oauth/google' }}
              >
                <svg className="mr-3 h-4 w-4 opacity-70 group-hover:opacity-100" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Identity Sync
              </Button>
            </div>
          </form>
          
          <div className="mt-10 pt-6 border-t border-white/5 text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              New to Draupnir?
              <a href="/register" className="text-primary-neon/80 hover:text-primary-neon transition-colors ml-2 underline underline-offset-4 decoration-primary-neon/30">
                Initialize Access
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
