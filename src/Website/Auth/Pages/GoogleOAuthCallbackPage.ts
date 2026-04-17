import type { GoogleOAuthService } from '@/Modules/Auth/Application/Services/GoogleOAuthService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { dashboardPathForWebRole } from '../dashboardPathForWebRole'

/**
 * Handles Google OAuth redirect callback (`/oauth/google/callback`).
 */
export class GoogleOAuthCallbackPage {
  constructor(private readonly googleOAuthService: GoogleOAuthService) {}

  /**
   * Handles the Google OAuth callback.
   * `GET /oauth/google/callback`
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const code = ctx.getQuery('code')
    const state = ctx.getQuery('state')
    const expectedState = ctx.get<string>('oauthExpectedState')

    if (!code) {
      return ctx.json({ error: 'Missing authorization code' }, 400)
    }

    if (!state) {
      return ctx.json({ error: 'Missing CSRF state' }, 400)
    }

    if (!expectedState || state !== expectedState) {
      return ctx.json({ error: 'Invalid OAuth state' }, 403)
    }

    const result = await this.googleOAuthService.exchange(code)

    if (!result.success) {
      return ctx.json({ error: 'OAuth authentication failed' }, 401)
    }

    return ctx.redirect(dashboardPathForWebRole(result.role ?? 'member'), 302)
  }
}
