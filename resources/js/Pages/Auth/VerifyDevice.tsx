import { Head, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

interface Props {
  csrfToken: string
  message?: string
  error?: string
}

export default function VerifyDevice({ message, error }: Props) {
  const auth = useAuth()
  const [userCode, setUserCode] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!auth.user) {
      router.visit('/login')
    }
  }, [auth.user])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    router.post('/verify-device', { userCode }, {
      onFinish: () => setLoading(false),
    })
  }

  if (!auth.user) return null

  return (
    <AuthLayout>
      <Head title="授權裝置" />
      <Card>
        <CardHeader>
          <CardTitle>授權 CLI 裝置</CardTitle>
          <CardDescription>輸入 CLI 顯示的 8 碼授權碼</CardDescription>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="rounded-md bg-green-50 px-4 py-6 text-center space-y-2">
              <div className="text-2xl text-green-600">✓</div>
              <p className="text-sm text-green-800 font-medium">{message}</p>
              <p className="text-xs text-green-700">您現在可以返回 CLI 繼續操作</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="userCode">授權碼</Label>
                <Input
                  id="userCode"
                  name="userCode"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  maxLength={8}
                  required
                  autoFocus
                  className="font-mono text-lg tracking-widest text-center uppercase"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || userCode.length !== 8}>
                {loading ? '驗證中…' : '授權'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
