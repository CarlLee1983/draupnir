import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { cn } from '@/lib/utils'
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

interface Props {
  profile: Profile | null
  error: { key: string } | null
  passwordRequirements: PasswordRequirements
  passwordChangeError?: string | null
}

type SettingsTab = 'account' | 'security'

export default function ManagerSettingsIndex({
  profile,
  error,
  passwordRequirements,
  passwordChangeError,
}: Props) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    router.put(
      '/manager/settings',
      { displayName },
      { onFinish: () => setProfileSaving(false) },
    )
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
  const strengthLabels = ['極弱', '弱', '中', '強', '極強']

  return (
    <ManagerLayout>
      <Head title="個人設定" />
      <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="font-sans text-2xl font-bold tracking-tight text-zinc-50">個人設定</h1>
            <p className="mt-2 font-sans text-sm text-zinc-400">管理你的帳號資訊與安全設定。</p>
          </div>

          <Separator className="mb-8 bg-zinc-800" />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <aside className="lg:col-span-1">
              <nav
                className="flex flex-row space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1"
                role="tablist"
                aria-label="設定分類"
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
                  帳號資訊
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
                  安全性
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
                    <CardTitle className="font-sans text-base font-semibold">個人檔案</CardTitle>
                  </div>
                  <CardDescription className="font-sans text-xs text-zinc-500">
                    這是在系統中顯示給其他成員看到的名稱。
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={submitProfile} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center border border-zinc-800 bg-zinc-950 font-mono text-xl text-indigo-400">
                        {displayName.slice(0, 2).toUpperCase() || '??'}
                      </div>
                      <div>
                        <h4 className="font-sans text-sm font-medium text-zinc-200">頭像預覽</h4>
                        <p className="font-sans text-xs text-zinc-500">基於顯示名稱自動生成</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">顯示名稱</label>
                      <Input 
                        className="rounded-none border-zinc-800 bg-zinc-950 font-sans text-zinc-100 focus:border-indigo-500 focus:ring-0"
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)} 
                      />
                      {error && (
                        <p className="flex items-center gap-1 font-sans text-xs text-red-400">
                          <AlertCircle className="h-3 w-3" /> 載入失敗，請稍後再試。
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        className="rounded-none bg-indigo-600 px-8 font-sans text-xs font-bold uppercase tracking-widest text-white hover:bg-indigo-500 disabled:opacity-50"
                        disabled={profileSaving}
                      >
                        {profileSaving ? '儲存中…' : '儲存變更'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
              )}

              {/* Password Section */}
              {activeTab === 'security' && (
              <Card
                id="settings-panel-security"
                role="tabpanel"
                aria-labelledby="settings-tab-security"
                className="rounded-none border-zinc-800 bg-zinc-900 shadow-none"
              >
                <CardHeader className="border-b border-zinc-800 px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-100">
                    <Shield className="h-4 w-4 text-zinc-400" />
                    <CardTitle className="font-sans text-base font-semibold">變更密碼</CardTitle>
                  </div>
                  <CardDescription className="font-sans text-xs text-zinc-500">
                    定期變更密碼以確保帳號安全。
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
                      <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">目前密碼</label>
                      <Input
                        type="password"
                        className="rounded-none border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-indigo-500 focus:ring-0"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">新密碼</label>
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
                            密碼強度：<span className={strength > 0 ? strengthColors[strength].replace('bg-', 'text-') : ''}>{strengthLabels[strength]}</span>
                          </p>
                          <ul className="flex gap-3 font-sans text-[9px] text-zinc-600">
                            <li className={password.length >= passwordRequirements.minLength ? 'text-zinc-400' : ''}>8+ 字元</li>
                            <li className={/[A-Z]/.test(password) ? 'text-zinc-400' : ''}>大寫</li>
                            <li className={/[0-9]/.test(password) ? 'text-zinc-400' : ''}>數字</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">確認新密碼</label>
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
                          {passwordSaving ? '更新中…' : '更新密碼'}
                        </Button>
                      </div>
                      <div className="flex items-start gap-2 border-l border-zinc-800 pl-4 py-1">
                        <LogOut className="mt-0.5 h-3 w-3 text-zinc-600" />
                        <p className="font-sans text-[10px] italic leading-relaxed text-zinc-500">
                          更新成功後會登出所有裝置，請以新密碼重新登入。
                        </p>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </ManagerLayout>
  )
}
