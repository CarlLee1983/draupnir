import type { LoginUserService } from '@/Modules/Auth/Application/Services/LoginUserService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import { isSecureRequest } from '@/Shared/Infrastructure/Http/isSecureRequest'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Inertia page controller for the login view.
 *
 * Handles rendering the login form and processing login submissions.
 */
export class LoginPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly loginService: LoginUserService,
  ) {}

  /**
   * Renders the login page.
   * `GET /login`
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    if (AuthMiddleware.getAuthContext(ctx)) {
      return ctx.redirect('/member/dashboard')
    }

    return this.inertia.render(ctx, 'Auth/Login', {
      lastEmail: undefined,
    })
  }

  /**
   * Processes the login form submission.
   * `POST /login`
   */
  async store(ctx: IHttpContext): Promise<Response> {
    const validated = ctx.get('validated') as { email?: string; password?: string } | undefined
    const email = validated?.email ?? ''
    const password = validated?.password ?? ''

    const result = await this.loginService.execute({ email, password })

    if (!result.success || !result.data) {
      return this.inertia.render(ctx, 'Auth/Login', {
        error: { key: 'auth.login.failed' },
        lastEmail: email,
      })
    }

    ctx.setCookie('auth_token', result.data.accessToken, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 900,
      secure: isSecureRequest(ctx),
    })

    ctx.setCookie('refresh_token', result.data.refreshToken, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      secure: isSecureRequest(ctx),
    })

    return ctx.redirect('/member/dashboard')
  }
}
