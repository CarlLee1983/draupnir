import { Head, router } from '@inertiajs/react'
import { useEffect } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  status: 'success' | 'error'
  message: I18nMessage
  redirectUrl?: string
  redirectSeconds?: number
}

export default function EmailVerification({ status, message, redirectUrl, redirectSeconds = 5 }: Props) {
  const { t } = useTranslation()
  useEffect(() => {
    if (status === 'success' && redirectUrl) {
      const timer = setTimeout(() => {
        router.visit(redirectUrl)
      }, redirectSeconds * 1000)
      return () => clearTimeout(timer)
    }
  }, [status, redirectUrl, redirectSeconds])

  return (
    <AuthLayout>
      <Head title={t('ui.auth.emailVerification.title')} />
      <Card>
        <CardHeader>
          <CardTitle>
            {status === 'success' ? t('ui.auth.emailVerification.successTitle') : t('ui.auth.emailVerification.failTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className={`text-4xl ${status === 'success' ? 'text-green-500' : 'text-destructive'}`}>
            {status === 'success' ? '✓' : '✕'}
          </div>
          <p className="text-sm text-muted-foreground">{t(message.key, message.params)}</p>
          {status === 'success' && redirectUrl && (
            <p className="text-xs text-muted-foreground">
              {t('ui.auth.emailVerification.redirecting', { seconds: redirectSeconds })}
            </p>
          )}
          {status === 'error' && (
            <Button variant="outline" onClick={() => { window.location.href = '/login' }}>
              {t('ui.auth.emailVerification.backToLogin')}
            </Button>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
