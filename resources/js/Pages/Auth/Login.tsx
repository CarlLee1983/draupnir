import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  csrfToken: string
  lastEmail?: string
  error?: string
}

export default function Login({ lastEmail, error }: Props) {
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
      <Head title="登入" />
      <Card>
        <CardHeader>
          <CardTitle>登入</CardTitle>
          <CardDescription>輸入您的帳號和密碼</CardDescription>
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
                placeholder="your@email.com"
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
            </div>
            <div className="text-right text-sm">
              <a href="/forgot-password" className="text-muted-foreground hover:underline">
                忘記密碼？
              </a>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登入中…' : '登入'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { window.location.href = '/oauth/google' }}
            >
              使用 Google 登入
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            還沒帳號？{' '}
            <a href="/register" className="underline hover:text-foreground">
              註冊
            </a>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
