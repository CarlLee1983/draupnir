import { Head, Link, useForm } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Lock, CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'

interface Props {
  token: string
  email: string
  valid: boolean
}

export default function ResetPassword({ token, email, valid }: Props) {
  const { t } = useTranslation()
  const [isSuccess, setIsSuccess] = useState(false)
  const { data, setData, post, processing, errors } = useForm({
    token,
    email,
    password: '',
    password_confirmation: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/reset-password', {
      onSuccess: () => setIsSuccess(true),
    })
  }

  if (!valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <XCircle className="h-6 w-6" />
            </div>
            <CardTitle>{t('ui.auth.resetPassword.invalidLink')}</CardTitle>
            <CardDescription>{t('ui.auth.resetPassword.requestNewLink')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href="/forgot-password">{t('ui.auth.resetPassword.reapply')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle>{t('ui.common.success')}</CardTitle>
            <CardDescription>Your password has been successfully reset.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href="/login">{t('ui.auth.forgotPassword.backToLogin')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Head title={t('ui.auth.resetPassword.title')} />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t('ui.auth.resetPassword.title')}</CardTitle>
          <CardDescription>Please enter your new password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('ui.auth.resetPassword.passwordLabel')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-10"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  required
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password_confirmation">{t('ui.auth.resetPassword.confirmLabel')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password_confirmation"
                  type="password"
                  className="pl-10"
                  value={data.password_confirmation}
                  onChange={(e) => setData('password_confirmation', e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={processing}>
              {processing ? t('ui.common.loading') : t('ui.auth.resetPassword.submitButton')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
