import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireMember } from './helpers/requireMember'

/**
 * Member profile settings: view and update display name (`Member/Settings/Index`).
 */
export class MemberSettingsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getProfileService: GetProfileService,
    private readonly updateProfileService: UpdateProfileService,
  ) {}

  /**
   * @returns Current profile for the authenticated user or login redirect.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireMember(ctx)
    if (!check.ok) return check.response!

    const result = await this.getProfileService.execute(check.auth!.userId)

    return this.inertia.render(ctx, 'Member/Settings/Index', {
      profile: result.success ? result.data : null,
      error: result.success ? null : result.message,
      formError: null,
    })
  }

  /**
   * PUT `/member/settings`: updates `displayName` from JSON body.
   *
   * @returns Re-rendered settings page with `formError` when update fails.
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
      error: profileResult.success ? null : profileResult.message,
      formError: updateResult.success ? null : updateResult.message,
    })
  }
}
