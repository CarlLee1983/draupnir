/**
 * Dependency injection bindings for Auth area Inertia pages.
 *
 * Registers page controllers as singletons in the DI container, resolving
 * required Application services and the shared InertiaService.
 */

import type { EmailVerificationService } from '@/Modules/Auth/Application/Services/EmailVerificationService'
import type { ForgotPasswordService } from '@/Modules/Auth/Application/Services/ForgotPasswordService'
import type { GoogleOAuthService } from '@/Modules/Auth/Application/Services/GoogleOAuthService'
import type { LoginUserService } from '@/Modules/Auth/Application/Services/LoginUserService'
import type { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import type { ResetPasswordService } from '@/Modules/Auth/Application/Services/ResetPasswordService'
import type { AuthorizeDeviceService } from '@/Modules/CliApi/Application/Services/AuthorizeDeviceService'
import { EmailVerificationPage } from '../Pages/EmailVerificationPage'
import { ForgotPasswordPage } from '../Pages/ForgotPasswordPage'
import { GoogleOAuthCallbackPage } from '../Pages/GoogleOAuthCallbackPage'
import { LoginPage } from '../Pages/LoginPage'
import { RegisterPage } from '../Pages/RegisterPage'
import { ResetPasswordPage } from '../Pages/ResetPasswordPage'
import { VerifyDevicePage } from '../Pages/VerifyDevicePage'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

import { AUTH_PAGE_KEYS } from '../keys'

/**
 * Registers Auth Inertia page classes as container singletons.
 */
export function registerAuthBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = AUTH_PAGE_KEYS

  container.singleton(
    k.login,
    (c) =>
      new LoginPage(c.make(i) as InertiaService, c.make('loginUserService') as LoginUserService),
  )

  container.singleton(
    k.register,
    (c) =>
      new RegisterPage(
        c.make(i) as InertiaService,
        c.make('registerUserService') as RegisterUserService,
      ),
  )

  container.singleton(
    k.forgotPassword,
    (c) =>
      new ForgotPasswordPage(
        c.make(i) as InertiaService,
        c.make('forgotPasswordService') as ForgotPasswordService,
      ),
  )

  container.singleton(
    k.resetPassword,
    (c) =>
      new ResetPasswordPage(
        c.make(i) as InertiaService,
        c.make('resetPasswordService') as ResetPasswordService,
      ),
  )

  container.singleton(
    k.emailVerification,
    (c) =>
      new EmailVerificationPage(
        c.make(i) as InertiaService,
        c.make('emailVerificationService') as EmailVerificationService,
      ),
  )

  container.singleton(
    k.googleOAuthCallback,
    (c) => new GoogleOAuthCallbackPage(c.make('googleOAuthService') as GoogleOAuthService),
  )

  container.singleton(
    k.verifyDevice,
    (c) =>
      new VerifyDevicePage(
        c.make(i) as InertiaService,
        c.make('authorizeDeviceService') as AuthorizeDeviceService,
      ),
  )
}
