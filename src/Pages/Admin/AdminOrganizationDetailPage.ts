import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireAdmin } from './helpers/requireAdmin'

/**
 * Admin organization detail with member list (`Admin/Organizations/Show`).
 */
export class AdminOrganizationDetailPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getOrgService: GetOrganizationService,
    private readonly listMembersService: ListMembersService,
  ) {}

  /**
   * @param ctx - Route param `id` = organization id.
   * @returns Inertia detail payload or auth failure response.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!
    const auth = check.auth!

    const orgId = ctx.getParam('id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Admin/Organizations/Show', {
        organization: null,
        members: [],
        error: '缺少 org id',
      })
    }

    const [orgResult, membersResult] = await Promise.all([
      this.getOrgService.execute(orgId, auth.userId, auth.role),
      this.listMembersService.execute(orgId, auth.userId, auth.role),
    ])

    const orgData = orgResult.success
      ? (orgResult.data as Record<string, unknown> | undefined)
      : undefined
    const organization = orgData
      ? {
          id: orgData.id as string,
          name: orgData.name as string,
          slug: orgData.slug as string,
          status: String(orgData.status ?? ''),
          createdAt: orgData.createdAt as string,
        }
      : null

    const rawMembers =
      membersResult.success && membersResult.data && typeof membersResult.data === 'object'
        ? ((membersResult.data as { members?: Record<string, unknown>[] }).members ?? [])
        : []

    const members = rawMembers.map((m) => ({
      userId: m.userId as string,
      role: String(m.role ?? ''),
      joinedAt: m.joinedAt as string,
    }))

    return this.inertia.render(ctx, 'Admin/Organizations/Show', {
      organization,
      members,
      error: orgResult.success ? null : orgResult.message,
    })
  }
}
