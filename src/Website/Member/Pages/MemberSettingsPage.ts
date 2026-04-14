import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { requireMember } from '@/Website/Member/middleware/requireMember'

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
    const check = requireMember(ctx)
    if (!check.ok) return check.response!

    const result = await this.getProfileService.execute(check.auth!.userId)

    return this.inertia.render(ctx, 'Member/Settings/Index', {
      profile: result.success ? result.data : null,
      error: result.success ? null : { key: 'member.settings.loadFailed' },
      formError: null,
    })
  }

  /**
   * Updates the member's profile information.
   *
   * @param ctx - Context containing updated profile fields in JSON body.
   * @returns Updated settings page or failure message.
   */
  async update(ctx: IHttpContext): Promise<Response> {
    const check = requireMember(ctx)
    if (!check.ok) return check.response!
    const auth = check.auth!

    const body = await ctx.getJsonBody<{ displayName?: string }>()
    const displayName = typeof body.displayName === 'string' ? body.displayName : ''

    const updateResult = await this.updateProfileService.execute(auth.userId, {
      displayName,
    })

    const profileResult = await this.getProfileService.execute(auth.userId)

    return this.inertia.render(ctx, 'Member/Settings/Index', {
      profile: profileResult.success ? profileResult.data : null,
      error: profileResult.success ? null : { key: 'member.settings.loadFailed' },
      formError: updateResult.success ? null : { key: 'member.settings.loadFailed' },
    })
  }
}
