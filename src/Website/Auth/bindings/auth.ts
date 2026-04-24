/**
 * Core authentication page bindings for the Auth module.
 */
import type { EmailVerificationService } from '@/Modules/Auth/Application/Services/EmailVerificationService'
import type { ForgotPasswordService } from '@/Modules/Auth/Application/Services/ForgotPasswordService'
import type { GoogleOAuthService } from '@/Modules/Auth/Application/Services/GoogleOAuthService'
import type { LoginUserService } from '@/Modules/Auth/Application/Services/LoginUserService'
import type { LogoutUserService } from '@/Modules/Auth/Application/Services/LogoutUserService'
import type { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import type { ResetPasswordService } from '@/Modules/Auth/Application/Services/ResetPasswordService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AUTH_PAGE_KEYS } from '../keys'
import { EmailVerificationPage } from '../Pages/EmailVerificationPage'
import { ForgotPasswordPage } from '../Pages/ForgotPasswordPage'
import { GoogleOAuthCallbackPage } from '../Pages/GoogleOAuthCallbackPage'
import { LoginPage } from '../Pages/LoginPage'
import { LogoutPage } from '../Pages/LogoutPage'
import { RegisterPage } from '../Pages/RegisterPage'
import { ResetPasswordPage } from '../Pages/ResetPasswordPage'

/**
 * Registers authentication pages (login, register, forgot password, etc.) in the DI container.
 *
 * @param container - Application container.
 */
export function registerAuthPagesBindings(container: IContainer): void {
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
        c.make('loginUserService') as LoginUserService,
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
    k.logout,
    (c) => new LogoutPage(c.make('logoutUserService') as LogoutUserService),
  )
}
