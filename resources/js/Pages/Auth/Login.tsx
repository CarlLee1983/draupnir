import { Head, router, usePage } from '@inertiajs/react'
import { useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  csrfToken: string
  lastEmail?: string
  error?: I18nMessage | null
}

type LoginPageProps = {
  flash?: { success?: I18nMessage }
} & Record<string, unknown>

export default function Login({ lastEmail, error }: Props) {
  const { t } = useTranslation()
  const { flash } = usePage<LoginPageProps>().props
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
      <Head title={t('ui.auth.login.title')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('ui.auth.login.title')}</CardTitle>
          <CardDescription>{t('ui.auth.login.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {flash?.success && (
              <Alert variant="info">
                <CheckCircle2 className="size-4" />
                <AlertDescription>{t(flash.success.key, flash.success.params)}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{t(error.key, error.params)}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t('ui.auth.login.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('ui.auth.login.emailPlaceholder')}
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t('ui.auth.login.passwordLabel')}</Label>
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
                {t('ui.auth.login.forgotPassword')}
              </a>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('ui.auth.login.submitLoading') : t('ui.auth.login.submitButton')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { window.location.href = '/oauth/google' }}
            >
              {t('ui.auth.login.googleButton')}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('ui.auth.login.noAccount')}{' '}
            <a href="/register" className="underline hover:text-foreground">
              {t('ui.auth.login.registerLink')}
            </a>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
