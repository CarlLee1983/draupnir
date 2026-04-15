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
    const accessToken = ctx.getCookie('auth_token')
    if (accessToken) {
      await this.logoutService.execute({ token: accessToken })
    }

    const refreshToken = ctx.getCookie('refresh_token')
    if (refreshToken) {
      await this.logoutService.execute({ token: refreshToken })
    }

    ctx.setCookie('auth_token', '', { path: '/', maxAge: 0, sameSite: 'Lax' })
    ctx.setCookie('refresh_token', '', { path: '/', maxAge: 0, sameSite: 'Lax' })

    return ctx.redirect('/login')
  }
}
