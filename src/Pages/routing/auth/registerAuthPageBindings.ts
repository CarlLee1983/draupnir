/**
 * Registers Auth Inertia page classes as container singletons.
 */
import type { EmailVerificationService } from '@/Modules/Auth/Application/Services/EmailVerificationService'
import type { ForgotPasswordService } from '@/Modules/Auth/Application/Services/ForgotPasswordService'
import type { GoogleOAuthService } from '@/Modules/Auth/Application/Services/GoogleOAuthService'
import type { LoginUserService } from '@/Modules/Auth/Application/Services/LoginUserService'
import type { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import type { ResetPasswordService } from '@/Modules/Auth/Application/Services/ResetPasswordService'
import type { AuthorizeDeviceService } from '@/Modules/CliApi/Application/Services/AuthorizeDeviceService'
import type { InertiaService } from '@/Pages/InertiaService'
import { PAGE_CONTAINER_KEYS } from '@/Pages/pageContainerKeys'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

import { EmailVerificationPage } from '@/Pages/Auth/EmailVerificationPage'
import { ForgotPasswordPage } from '@/Pages/Auth/ForgotPasswordPage'
import { GoogleOAuthCallbackPage } from '@/Pages/Auth/GoogleOAuthCallbackPage'
import { LoginPage } from '@/Pages/Auth/LoginPage'
import { RegisterPage } from '@/Pages/Auth/RegisterPage'
import { ResetPasswordPage } from '@/Pages/Auth/ResetPasswordPage'
import { VerifyDevicePage } from '@/Pages/Auth/VerifyDevicePage'

import { AUTH_PAGE_KEYS } from './authPageKeys'

/**
 * @param container - DI container; `InertiaService` must already be bound.
 */
export function registerAuthPageBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = AUTH_PAGE_KEYS

  container.singleton(k.login, (c) =>
    new LoginPage(c.make(i) as InertiaService, c.make('loginUserService') as LoginUserService),
  )

  container.singleton(k.register, (c) =>
    new RegisterPage(
      c.make(i) as InertiaService,
      c.make('registerUserService') as RegisterUserService,
    ),
  )

  container.singleton(k.forgotPassword, (c) =>
    new ForgotPasswordPage(
      c.make(i) as InertiaService,
      c.make('forgotPasswordService') as ForgotPasswordService,
    ),
  )

  container.singleton(k.resetPassword, (c) =>
    new ResetPasswordPage(
      c.make(i) as InertiaService,
      c.make('resetPasswordService') as ResetPasswordService,
    ),
  )

  container.singleton(k.emailVerification, (c) =>
    new EmailVerificationPage(
      c.make(i) as InertiaService,
      c.make('emailVerificationService') as EmailVerificationService,
    ),
  )

  container.singleton(
    k.googleOAuthCallback,
    (c) => new GoogleOAuthCallbackPage(c.make('googleOAuthService') as GoogleOAuthService),
  )

  container.singleton(k.verifyDevice, (c) =>
    new VerifyDevicePage(
      c.make(i) as InertiaService,
      c.make('authorizeDeviceService') as AuthorizeDeviceService,
    ),
  )
}
