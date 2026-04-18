import type { ListSessionsService } from '@/Modules/Auth/Application/Services/ListSessionsService'
import type { RevokeAllSessionsService } from '@/Modules/Auth/Application/Services/RevokeAllSessionsService'
import { sha256 } from '@/Modules/Auth/Application/Utils/sha256'
import type { UpdateProfileParams } from '@/Modules/Profile/Presentation/Requests/UpdateProfileRequest'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware, extractRawAuthToken } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import { setFlash } from '@/Website/Http/Inertia/SharedPropsBuilder'
import { REFRESHED_AUTH_TOKEN_HASH_KEY } from '@/Website/Http/Middleware/TokenRefreshMiddleware'

/**
 * Page handler for member profile settings.
 *
 * Path: `/member/settings`
 * React Page: `Member/Settings/Index`
 */
export class MemberSettingsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getProfileService: GetProfileService,
    private readonly updateProfileService: UpdateProfileService,
    private readonly listSessionsService: ListSessionsService,
    private readonly revokeAllSessionsService: RevokeAllSessionsService,
  ) {}

  private async renderSettings(
    ctx: IHttpContext,
    extras: Record<string, unknown> = {},
  ): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const result = await this.getProfileService.execute(auth.userId)
    // Prefer the hash of the silently-refreshed access token so the current device
    // still highlights after TokenRefreshMiddleware minted a new token.
    const refreshedHash = ctx.get<string>(REFRESHED_AUTH_TOKEN_HASH_KEY) ?? null
    const raw = refreshedHash ? null : extractRawAuthToken(ctx)
    const currentHash = refreshedHash ?? (raw ? await sha256(raw) : null)
    const sessionsResult = await this.listSessionsService.execute(auth.userId, currentHash)
    const sessions = sessionsResult.success ? sessionsResult.sessions : []

    return this.inertia.render(ctx, 'Member/Settings/Index', {
      user: {
        id: auth.userId,
        email: auth.email,
        name: result.success ? (result.data?.displayName ?? '') : '',
        role: auth.role,
      },
      profile: result.success ? (result.data ?? null) : null,
      error: result.success ? null : { key: 'member.settings.loadFailed' },
      sessions,
      ...extras,
    })
  }

  /**
   * Displays the profile settings page.
   *
   * @param ctx - Context to identify the authenticated user.
   * @returns Current user profile in Inertia response.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    return this.renderSettings(ctx)
  }

  /**
   * Updates the member's profile information.
   *
   * @param ctx - Context containing updated profile fields validated by UpdateProfileRequest.
   * @returns Updated settings page or failure message.
   */
  async update(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const body = (ctx.get('validated') as UpdateProfileParams | undefined) ?? {}

    await this.updateProfileService.execute(auth.userId, {
      displayName: body.displayName,
    })

    return ctx.redirect('/member/settings')
  }

  async revokeAllSessions(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const result = await this.revokeAllSessionsService.execute(auth.userId)
    if (!result.success) {
      return this.renderSettings(ctx, { sessionsRevokeError: result.message })
    }
    ctx.setCookie('auth_token', '', { path: '/', maxAge: 0, sameSite: 'Lax' })
    ctx.setCookie('refresh_token', '', { path: '/', maxAge: 0, sameSite: 'Lax' })
    setFlash(ctx, 'success', { key: 'ui.member.settings.allSessionsRevoked' })
    return ctx.redirect('/login')
  }
}

