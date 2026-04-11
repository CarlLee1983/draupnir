import type { GoogleOAuthService } from '@/Modules/Auth/Application/Services/GoogleOAuthService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * Handles Google OAuth redirect callback (`/oauth/google/callback`).
 */
export class GoogleOAuthCallbackPage {
  constructor(private readonly googleOAuthService: GoogleOAuthService) {}

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

    return ctx.redirect('/member/dashboard', 302)
  }
}
