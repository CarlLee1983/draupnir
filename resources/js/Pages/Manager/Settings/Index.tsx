import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { cn } from '@/lib/utils'
import { useTranslation, type MessageKey } from '@/lib/i18n'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Shield, User, LogOut } from 'lucide-react'

interface Profile {
  displayName?: string
}

interface PasswordRequirements {
  minLength: number
  requiresUppercase: boolean
  requiresLowercase: boolean
  requiresNumbers: boolean
  requiresSpecialChars?: boolean
}

interface AuthSessionRow {
  id: string
  type: 'access'
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

interface Props {
  profile: Profile | null
  error: { key: string } | null
  passwordRequirements: PasswordRequirements
  passwordChangeError?: string | null
  sessions: AuthSessionRow[]
  sessionsRevokeError?: string | null
}

type SettingsTab = 'account' | 'security'

const PASSWORD_STRENGTH_KEYS: MessageKey[] = [
  'ui.manager.settings.passwordStrength.veryWeak',
  'ui.manager.settings.passwordStrength.weak',
  'ui.manager.settings.passwordStrength.medium',
  'ui.manager.settings.passwordStrength.strong',
  'ui.manager.settings.passwordStrength.veryStrong',
]

function formatSessionTime(iso: string, locale: string): string {
  try {
    const tag = locale === 'en' ? 'en-US' : 'zh-TW'
    return new Date(iso).toLocaleString(tag, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export default function ManagerSettingsIndex({
  profile,
  error,
  passwordRequirements,
  passwordChangeError,
  sessions,
  sessionsRevokeError,
}: Props) {
  const { t, locale } = useTranslation()
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [revokingAll, setRevokingAll] = useState(false)

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    router.put(
      '/manager/settings',
      { displayName },
      { onFinish: () => setProfileSaving(false) },
    )
  }

  const submitRevokeAllSessions = (e: React.FormEvent) => {
    e.preventDefault()
    if (!window.confirm(t('ui.member.settings.revokeAllSessionsConfirm'))) return
    setRevokingAll(true)
    router.post('/manager/settings/sessions/revoke-all', {}, { onFinish: () => setRevokingAll(false) })
  }

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSaving(true)
    router.post(
      '/manager/settings/password',
      { currentPassword, password, passwordConfirmation },
      {
        onFinish: () => setPasswordSaving(false),
      },
    )
  }

  const getPasswordStrength = (pwd: string) => {
    let score = 0
    if (!pwd) return 0
    if (pwd.length >= passwordRequirements.minLength) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    return score
  }

  const strength = getPasswordStrength(password)
  const strengthColors = ['bg-zinc-800', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']
  const strengthLabel = t(PASSWORD_STRENGTH_KEYS[strength] ?? PASSWORD_STRENGTH_KEYS[0])

  return (
    <ManagerLayout>
      <Head title={t('ui.member.settings.heading')} />
      <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="font-sans text-2xl font-bold tracking-tight text-zinc-50">
              {t('ui.member.settings.heading')}
            </h1>
            <p className="mt-2 font-sans text-sm text-zinc-400">
              {t('ui.manager.settings.pageDescription')}
            </p>
          </div>

          <Separator className="mb-8 bg-zinc-800" />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <aside className="lg:col-span-1">
              <nav
                className="flex flex-row space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1"
                role="tablist"
                aria-label={t('ui.manager.settings.navAriaLabel')}
              >
                <Button
                  type="button"
                  variant="ghost"
                  role="tab"
                  aria-selected={activeTab === 'account'}
                  id="settings-tab-account"
                  aria-controls="settings-panel-account"
                  onClick={() => setActiveTab('account')}
                  className={cn(
                    'justify-start rounded-none border-l-2 font-mono text-[11px] uppercase tracking-widest hover:bg-zinc-900',
                    activeTab === 'account'
                      ? 'border-indigo-500 bg-zinc-900/50 text-zinc-100'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  <User className="mr-2 h-4 w-4" />
                  {t('ui.manager.settings.tabAccount')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  role="tab"
                  aria-selected={activeTab === 'security'}
                  id="settings-tab-security"
                  aria-controls="settings-panel-security"
                  onClick={() => setActiveTab('security')}
                  className={cn(
                    'justify-start rounded-none border-l-2 font-mono text-[11px] uppercase tracking-widest hover:bg-zinc-900',
                    activeTab === 'security'
                      ? 'border-indigo-500 bg-zinc-900/50 text-zinc-100'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  {t('ui.manager.settings.tabSecurity')}
                </Button>
              </nav>
            </aside>

            <div className="lg:col-span-2 space-y-8">
              {/* Profile Section */}
              {activeTab === 'account' && (
              <Card
                id="settings-panel-account"
                role="tabpanel"
                aria-labelledby="settings-tab-account"
                className="rounded-none border-zinc-800 bg-zinc-900 shadow-none"
              >
                <CardHeader className="border-b border-zinc-800 px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-100">
                    <User className="h-4 w-4 text-indigo-400" />
                    <CardTitle className="font-sans text-base font-semibold">
                      {t('ui.manager.settings.profileCardTitle')}
                    </CardTitle>
                  </div>
                  <CardDescription className="font-sans text-xs text-zinc-500">
                    {t('ui.manager.settings.profileCardDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={submitProfile} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center border border-zinc-800 bg-zinc-950 font-mono text-xl text-indigo-400">
                        {displayName.slice(0, 2).toUpperCase() || '??'}
                      </div>
                      <div>
                        <h4 className="font-sans text-sm font-medium text-zinc-200">
                          {t('ui.manager.settings.avatarPreview')}
                        </h4>
                        <p className="font-sans text-xs text-zinc-500">
                          {t('ui.manager.settings.avatarPreviewHint')}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                        {t('ui.member.settings.nameLabel')}
                      </label>
                      <Input 
                        className="rounded-none border-zinc-800 bg-zinc-950 font-sans text-zinc-100 focus:border-indigo-500 focus:ring-0"
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)} 
                      />
                      {error && (
                        <p className="flex items-center gap-1 font-sans text-xs text-red-400">
                          <AlertCircle className="h-3 w-3" /> {t('ui.manager.settings.loadFailedRetry')}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        className="rounded-none bg-indigo-600 px-8 font-sans text-xs font-bold uppercase tracking-widest text-white hover:bg-indigo-500 disabled:opacity-50"
                        disabled={profileSaving}
                      >
                        {profileSaving ? t('ui.member.settings.submitLoading') : t('ui.member.settings.submitButton')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
              )}

              {/* Password + sessions (security tab) */}
              {activeTab === 'security' && (
              <>
              <Card
                id="settings-panel-security"
                role="tabpanel"
                aria-labelledby="settings-tab-security"
                className="rounded-none border-zinc-800 bg-zinc-900 shadow-none"
              >
                <CardHeader className="border-b border-zinc-800 px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-100">
                    <Shield className="h-4 w-4 text-zinc-400" />
                    <CardTitle className="font-sans text-base font-semibold">
                      {t('ui.manager.settings.changePasswordTitle')}
                    </CardTitle>
                  </div>
                  <CardDescription className="font-sans text-xs text-zinc-500">
                    {t('ui.manager.settings.changePasswordDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={submitPassword} className="space-y-6">
                    {passwordChangeError && (
                      <div className="flex items-center gap-2 border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{passwordChangeError}</span>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                        {t('ui.manager.settings.currentPasswordLabel')}
                      </label>
                      <Input
                        type="password"
                        className="rounded-none border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-indigo-500 focus:ring-0"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                        {t('ui.manager.settings.newPasswordLabel')}
                      </label>
                      <Input
                        type="password"
                        className="rounded-none border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-indigo-500 focus:ring-0"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      
                      <div className="pt-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div 
                              key={i} 
                              className={`h-1 flex-1 transition-colors duration-300 ${i <= strength ? strengthColors[strength] : 'bg-zinc-800'}`} 
                            />
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="font-sans text-[10px] text-zinc-500">
                            {t('ui.manager.settings.passwordStrengthIntro')}
                            <span className={strength > 0 ? strengthColors[strength].replace('bg-', 'text-') : ''}>
                              {strengthLabel}
                            </span>
                          </p>
                          <ul className="flex gap-3 font-sans text-[9px] text-zinc-600">
                            <li className={password.length >= passwordRequirements.minLength ? 'text-zinc-400' : ''}>
                              {t('ui.manager.settings.passwordHintShortMin', { min: passwordRequirements.minLength })}
                            </li>
                            <li className={/[A-Z]/.test(password) ? 'text-zinc-400' : ''}>
                              {t('ui.auth.register.passwordUppercase')}
                            </li>
                            <li className={/[0-9]/.test(password) ? 'text-zinc-400' : ''}>
                              {t('ui.auth.register.passwordNumbers')}
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                        {t('ui.manager.settings.confirmNewPasswordLabel')}
                      </label>
                      <Input
                        type="password"
                        className="rounded-none border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-indigo-500 focus:ring-0"
                        autoComplete="new-password"
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          className="rounded-none border border-zinc-700 bg-zinc-800 px-8 font-sans text-xs font-bold uppercase tracking-widest text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                          disabled={passwordSaving}
                        >
                          {passwordSaving
                            ? t('ui.manager.settings.updatePasswordSubmitting')
                            : t('ui.manager.settings.updatePasswordSubmit')}
                        </Button>
                      </div>
                      <div className="flex items-start gap-2 border-l border-zinc-800 pl-4 py-1">
                        <LogOut className="mt-0.5 h-3 w-3 text-zinc-600" />
                        <p className="font-sans text-[10px] italic leading-relaxed text-zinc-500">
                          {t('ui.manager.settings.passwordChangeLogoutNote')}
                        </p>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card
                className="rounded-none border-zinc-800 bg-zinc-900 shadow-none"
              >
                <CardHeader className="border-b border-zinc-800 px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-100">
                    <LogOut className="h-4 w-4 text-amber-400" />
                    <CardTitle className="font-sans text-base font-semibold">
                      {t('ui.member.settings.sessionsCard')}
                    </CardTitle>
                  </div>
                  <CardDescription className="font-sans text-xs text-zinc-500">
                    {t('ui.manager.settings.sessionsDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  {sessionsRevokeError && (
                    <div className="flex items-center gap-2 border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{sessionsRevokeError}</span>
                    </div>
                  )}
                  {sessions.length === 0 ? (
                    <p className="font-sans text-sm text-zinc-500">
                      {t('ui.manager.settings.sessionsEmptyList')}
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-zinc-800">
                      <table className="w-full min-w-[320px] border-collapse text-left font-sans text-xs">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-500">
                            <th className="px-3 py-2 font-mono uppercase tracking-wider">
                              {t('ui.member.settings.sessionsColCreated')}
                            </th>
                            <th className="px-3 py-2 font-mono uppercase tracking-wider">
                              {t('ui.member.settings.sessionsColExpires')}
                            </th>
                            <th className="px-3 py-2 font-mono uppercase tracking-wider">
                              {t('ui.member.settings.sessionsColStatus')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map((s) => (
                            <tr key={s.id} className="border-b border-zinc-800/80 text-zinc-300 last:border-0">
                              <td className="px-3 py-2">{formatSessionTime(s.createdAt, locale)}</td>
                              <td className="px-3 py-2">{formatSessionTime(s.expiresAt, locale)}</td>
                              <td className="px-3 py-2">
                                {s.isCurrent ? (
                                  <span className="font-mono text-[10px] uppercase tracking-wide text-indigo-400">
                                    {t('ui.manager.settings.sessionThisDevice')}
                                  </span>
                                ) : (
                                  <span className="text-zinc-600">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <form onSubmit={submitRevokeAllSessions}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="rounded-none border-amber-900/50 bg-zinc-950 font-sans text-xs font-bold uppercase tracking-widest text-amber-200 hover:bg-amber-950/30 disabled:opacity-50"
                      disabled={revokingAll}
                    >
                      {revokingAll
                        ? t('ui.manager.settings.revokeAllProcessing')
                        : t('ui.manager.settings.revokeAllDevices')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ManagerLayout>
  )
}
