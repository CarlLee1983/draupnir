import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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

  return (
    <ManagerLayout>
      <Head title="個人設定" />
      <div className="p-4 max-w-md space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>個人設定</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitProfile} className="grid gap-3">
              <div>
                <label className="text-sm">顯示名稱</label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <Button type="submit" disabled={profileSaving}>
                {profileSaving ? '儲存中…' : '儲存'}
              </Button>
              {error && <p className="text-sm text-red-500">載入失敗</p>}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>變更密碼</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitPassword} className="grid gap-3">
              {passwordChangeError && (
                <p className="text-sm text-red-500">{passwordChangeError}</p>
              )}
              <div>
                <label className="text-sm">目前密碼</label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm">新密碼</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  <li className={password.length >= passwordRequirements.minLength ? 'text-green-600' : ''}>
                    至少 {passwordRequirements.minLength} 個字元
                  </li>
                  {passwordRequirements.requiresUppercase && (
                    <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>包含大寫字母</li>
                  )}
                  {passwordRequirements.requiresLowercase && (
                    <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>包含小寫字母</li>
                  )}
                  {passwordRequirements.requiresNumbers && (
                    <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>包含數字</li>
                  )}
                </ul>
              </div>
              <div>
                <label className="text-sm">確認新密碼</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" disabled={passwordSaving}>
                {passwordSaving ? '更新中…' : '更新密碼'}
              </Button>
              <p className="text-xs text-muted-foreground">
                更新成功後會登出所有裝置，請以新密碼重新登入。
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  )
}
