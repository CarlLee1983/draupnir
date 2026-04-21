import { Head, router } from '@inertiajs/react'
import { useState, type FormEvent } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface PasswordRequirements {
  minLength: number
  requiresUppercase: boolean
  requiresLowercase: boolean
  requiresNumbers: boolean
  requiresSpecialChars: boolean
}

interface Props {
  csrfToken: string
  passwordRequirements: PasswordRequirements
  error?: I18nMessage
}

export default function Register({ passwordRequirements, error }: Props) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    router.post('/register', { email, password, passwordConfirmation, agreedToTerms }, {
      onFinish: () => setLoading(false),
    })
  }

  return (
    <AuthLayout>
      <Head title={t('ui.auth.register.title')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('ui.auth.register.title')}</CardTitle>
          <CardDescription>{t('ui.auth.register.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{t(error.key, error.params)}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t('ui.auth.register.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t('ui.auth.register.passwordLabel')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <ul className="text-xs text-muted-foreground flex flex-col gap-1 mt-1">
                <li className={password.length >= passwordRequirements.minLength ? 'text-green-600' : ''}>
                  {t('ui.auth.register.passwordMinLength', { min: passwordRequirements.minLength })}
                </li>
                {passwordRequirements.requiresUppercase && (
                  <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>{t('ui.auth.register.passwordUppercase')}</li>
                )}
                {passwordRequirements.requiresLowercase && (
                  <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>{t('ui.auth.register.passwordLowercase')}</li>
                )}
                {passwordRequirements.requiresNumbers && (
                  <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>{t('ui.auth.register.passwordNumbers')}</li>
                )}
                {passwordRequirements.requiresSpecialChars && (
                  <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : ''}>{t('ui.auth.register.passwordSpecial')}</li>
                )}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="passwordConfirmation">{t('ui.auth.register.confirmPasswordLabel')}</Label>
              <Input
                id="passwordConfirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="agreedToTerms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                required
              />
              <Label htmlFor="agreedToTerms" className="text-sm font-normal cursor-pointer">
                {t('ui.auth.register.termsCheckbox')}
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !agreedToTerms}>
              {loading ? t('ui.auth.register.submitLoading') : t('ui.auth.register.title')}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('ui.auth.register.hasAccount')}{' '}
            <a href="/login" className="underline hover:text-foreground">
              {t('ui.auth.register.loginLink')}
            </a>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
