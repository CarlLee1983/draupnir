import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/lib/i18n'

interface Props {
  csrfToken: string
  message?: string
}

export default function ForgotPassword({ message }: Props) {
  const { t } = useTranslation()
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
      <Head title={t('ui.auth.forgotPassword.title')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('ui.auth.forgotPassword.title')}</CardTitle>
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
                <Label htmlFor="email">{t('ui.auth.forgotPassword.emailLabel')}</Label>
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
                {t('ui.auth.forgotPassword.submitButton')}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <a href="/login" className="underline hover:text-foreground">
              {t('ui.auth.forgotPassword.backToLogin')}
            </a>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
