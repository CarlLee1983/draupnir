/**
 * Google OAuth routes: authorize endpoint redirects to Google.
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'

function generateState(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let state = ''
  for (let i = 0; i < 32; i++) {
    state += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return state
}

/**
 * Registers OAuth HTTP routes on the module router.
 */
export function registerOAuthRoutes(router: IModuleRouter): void {
  router.get('/oauth/google/authorize', async (ctx: IHttpContext) => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? ''
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? ''

    if (!clientId || !redirectUri) {
      return ctx.json({ error: 'Google OAuth is not configured' }, 503)
    }

    const state = generateState()
    // Persist expected state in real session / cache so the callback can validate (ctx.set alone does not survive the Google redirect).
    ctx.set('oauthExpectedState', state)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    })

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return ctx.redirect(googleAuthUrl, 302)
  })
}
