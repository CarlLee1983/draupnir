import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  csrfToken: string
  token: string
  tokenValid: boolean
  message?: string
  error?: string
}

export default function ResetPassword({ token, tokenValid, error }: Props) {
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    router.post(`/reset-password/${token}`, { password, passwordConfirmation }, {
      onFinish: () => setLoading(false),
    })
  }

  if (!tokenValid) {
    return (
      <AuthLayout>
        <Head title="重設密碼" />
        <Card>
          <CardHeader>
            <CardTitle>連結已過期</CardTitle>
            <CardDescription>此重設連結已失效或過期</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              請重新申請密碼重設連結。
            </p>
            <Button variant="outline" className="w-full" onClick={() => { window.location.href = '/forgot-password' }}>
              重新申請
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Head title="重設密碼" />
      <Card>
        <CardHeader>
          <CardTitle>設定新密碼</CardTitle>
          <CardDescription>請輸入您的新密碼</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">新密碼</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirmation">確認新密碼</Label>
              <Input
                id="passwordConfirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '重設中…' : '重設密碼'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
