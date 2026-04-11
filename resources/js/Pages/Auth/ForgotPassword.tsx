import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  csrfToken: string
  message?: string
}

export default function ForgotPassword({ message }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    router.post('/forgot-password', { email }, {
      onFinish: () => setLoading(false),
    })
  }

  return (
    <AuthLayout>
      <Head title="忘記密碼" />
      <Card>
        <CardHeader>
          <CardTitle>忘記密碼</CardTitle>
          <CardDescription>輸入您的電子郵件，我們將寄送重設連結</CardDescription>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
              {message}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '寄送中…' : '寄送重設連結'}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <a href="/login" className="underline hover:text-foreground">
              返回登入
            </a>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
