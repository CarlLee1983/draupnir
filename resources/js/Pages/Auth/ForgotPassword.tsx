import { Head, Link, useForm } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [isSent, setIsSent] = useState(false)
  const { data, setData, post, processing, errors } = useForm({
    email: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/forgot-password', {
      onSuccess: () => setIsSent(true),
    })
  }

  if (isSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle>{t('ui.common.success')}</CardTitle>
            <CardDescription>
              We've sent a password reset link to <strong>{data.email}</strong>.
              Please check your inbox.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('ui.auth.forgotPassword.backToLogin')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Head title={t('ui.auth.forgotPassword.title')} />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t('ui.auth.forgotPassword.title')}</CardTitle>
          <CardDescription>{t('ui.auth.login.forgotPassword').replace('？', '')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('ui.auth.forgotPassword.emailLabel')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  required
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={processing}>
              {processing ? t('ui.common.loading') : t('ui.auth.forgotPassword.submitButton')}
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('ui.auth.forgotPassword.backToLogin')}
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
