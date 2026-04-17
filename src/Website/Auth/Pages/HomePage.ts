import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { dashboardPathForWebRole } from '../dashboardPathForWebRole'

/**
 * Root landing: authenticated users go to their dashboard; guests go to login.
 * `GET /`
 */
export class HomePage {
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (auth) {
      return ctx.redirect(dashboardPathForWebRole(auth.role))
    }
    return ctx.redirect('/login')
  }
}
