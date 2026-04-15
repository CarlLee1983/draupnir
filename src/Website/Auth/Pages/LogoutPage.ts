import type { LogoutUserService } from '@/Modules/Auth/Application/Services/LogoutUserService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * Inertia page controller for logout.
 *
 * Handles POST /logout: revokes the current auth token,
 * clears the auth cookie, and redirects to /login.
 */
export class LogoutPage {
  constructor(private readonly logoutService: LogoutUserService) {}

  /**
   * Processes the logout request.
   * `POST /logout`
   */
  async store(ctx: IHttpContext): Promise<Response> {
    const token = ctx.getCookie('auth_token')

    if (token) {
      await this.logoutService.execute({ token })
    }

    ctx.setCookie('auth_token', '', { path: '/', maxAge: 0, sameSite: 'Lax' })

    return ctx.redirect('/login')
  }
}
