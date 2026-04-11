/**
 * Registers Auth Inertia page classes as container singletons.
 */
import type { GoogleOAuthService } from '@/Modules/Auth/Application/Services/GoogleOAuthService'
import type { InertiaService } from '@/Pages/InertiaService'
import { PAGE_CONTAINER_KEYS } from '@/Pages/pageContainerKeys'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

import { EmailVerificationPage } from '../../Auth/EmailVerificationPage'
import { ForgotPasswordPage } from '../../Auth/ForgotPasswordPage'
import { GoogleOAuthCallbackPage } from '../../Auth/GoogleOAuthCallbackPage'
import { LoginPage } from '../../Auth/LoginPage'
import { RegisterPage } from '../../Auth/RegisterPage'
import { ResetPasswordPage } from '../../Auth/ResetPasswordPage'

import { AUTH_PAGE_KEYS } from './authPageKeys'

/**
 * @param container - DI container; `InertiaService` must already be bound.
 */
export function registerAuthPageBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = AUTH_PAGE_KEYS

  container.singleton(k.login, (c) => new LoginPage(c.make(i) as InertiaService))

  container.singleton(k.register, (c) => new RegisterPage(c.make(i) as InertiaService))

  container.singleton(
    k.forgotPassword,
    (c) => new ForgotPasswordPage(c.make(i) as InertiaService),
  )

  container.singleton(k.resetPassword, (c) => new ResetPasswordPage(c.make(i) as InertiaService))

  container.singleton(
    k.emailVerification,
    (c) => new EmailVerificationPage(c.make(i) as InertiaService),
  )

  container.singleton(
    k.googleOAuthCallback,
    (c) => new GoogleOAuthCallbackPage(c.make('googleOAuthService') as GoogleOAuthService),
  )
}
