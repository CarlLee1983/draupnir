import { Head, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useTranslation } from '@/lib/i18n'

interface Props {
  csrfToken: string
  message?: string
  error?: string
}

export default function VerifyDevice({ message, error }: Props) {
  const auth = useAuth()
  const { t } = useTranslation()
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
      <Head title={t('ui.auth.verifyDevice.title')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('ui.auth.verifyDevice.heading')}</CardTitle>
          <CardDescription>{t('ui.auth.verifyDevice.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="rounded-md bg-green-50 px-4 py-6 text-center space-y-2">
              <div className="text-2xl text-green-600">✓</div>
              <p className="text-sm text-green-800 font-medium">{message}</p>
              <p className="text-xs text-green-700">{t('ui.auth.verifyDevice.successMessage')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="userCode">{t('ui.auth.verifyDevice.codeLabel')}</Label>
                <Input
                  id="userCode"
                  name="userCode"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                  placeholder={t('ui.auth.verifyDevice.codePlaceholder')}
                  maxLength={8}
                  required
                  autoFocus
                  className="font-mono text-lg tracking-widest text-center uppercase"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || userCode.length !== 8}>
                {loading ? t('ui.auth.verifyDevice.submitLoading') : t('ui.auth.verifyDevice.submitButton')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
