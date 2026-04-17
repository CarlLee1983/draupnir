import type { UpdateProfileParams } from '@/Modules/Profile/Presentation/Requests/UpdateProfileRequest'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

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
  ) {}

  private async renderSettings(
    ctx: IHttpContext,
    extras: Record<string, unknown> = {},
  ): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const result = await this.getProfileService.execute(auth.userId)

    return this.inertia.render(ctx, 'Member/Settings/Index', {
      user: {
        id: auth.userId,
        email: auth.email,
        name: result.success ? (result.data?.displayName ?? '') : '',
        role: auth.role,
      },
      profile: result.success ? (result.data ?? null) : null,
      error: result.success ? null : { key: 'member.settings.loadFailed' },
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
}

