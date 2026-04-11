import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PasswordRequirements {
  minLength: number
  requiresUppercase: boolean
  requiresLowercase: boolean
  requiresNumbers: boolean
  requiresSpecialChars: boolean
}

interface Props {
  csrfToken: string
  passwordRequirements: PasswordRequirements
  error?: string
}

export default function Register({ passwordRequirements, error }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    router.post('/register', { email, password, passwordConfirmation, agreedToTerms }, {
      onFinish: () => setLoading(false),
    })
  }

  return (
    <AuthLayout>
      <Head title="註冊" />
      <Card>
        <CardHeader>
          <CardTitle>建立帳號</CardTitle>
          <CardDescription>輸入您的資訊以建立帳號</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                <li className={password.length >= passwordRequirements.minLength ? 'text-green-600' : ''}>
                  最少 {passwordRequirements.minLength} 個字元
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
                {passwordRequirements.requiresSpecialChars && (
                  <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : ''}>包含特殊符號</li>
                )}
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirmation">確認密碼</Label>
              <Input
                id="passwordConfirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="agreedToTerms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                required
              />
              <Label htmlFor="agreedToTerms" className="text-sm font-normal cursor-pointer">
                我同意服務條款
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !agreedToTerms}>
              {loading ? '建立中…' : '建立帳號'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            已有帳號？{' '}
            <a href="/login" className="underline hover:text-foreground">
              登入
            </a>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
