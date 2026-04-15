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

  /**
   * Displays the profile settings page.
   *
   * @param ctx - Context to identify the authenticated user.
   * @returns Current user profile in Inertia response.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const result = await this.getProfileService.execute(auth.userId)

    return this.inertia.render(ctx, 'Member/Settings/Index', {
      user: {
        id: auth.userId,
        email: auth.email,
        name: result.success ? (result.data?.displayName ?? '') : '',
        role: auth.role,
      },
      formError: result.success ? null : { key: 'member.settings.loadFailed' },
    })
  }

  /**
   * Updates the member's profile information.
   *
   * @param ctx - Context containing updated profile fields in JSON body.
   * @returns Updated settings page or failure message.
   */
  async update(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    const body = await ctx.getJsonBody<{ name?: string }>()
    const displayName = typeof body.name === 'string' ? body.name : ''

    const updateResult = await this.updateProfileService.execute(auth.userId, {
      displayName,
    })

    const profileResult = await this.getProfileService.execute(auth.userId)

    return this.inertia.render(ctx, 'Member/Settings/Index', {
      user: {
        id: auth.userId,
        email: auth.email,
        name: profileResult.success ? (profileResult.data?.displayName ?? '') : '',
        role: auth.role,
      },
      formError: updateResult.success ? null : { key: 'member.settings.loadFailed' },
    })
  }
}
