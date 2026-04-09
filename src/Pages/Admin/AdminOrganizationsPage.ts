import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminOrganizationsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListOrganizationsService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const page = parseInt(ctx.getQuery('page') ?? '1', 10)
    const limit = parseInt(ctx.getQuery('limit') ?? '20', 10)

    const result = await this.listService.execute(page, limit)

    const organizations =
      result.success && result.data?.organizations
        ? result.data.organizations.map((o) => {
            const row = o as Record<string, unknown>
            return {
              id: row.id as string,
              name: row.name as string,
              slug: row.slug as string,
              status: row.status as 'active' | 'suspended',
              memberCount: 0,
              createdAt: row.createdAt as string,
            }
          })
        : []

    return this.inertia.render(ctx, 'Admin/Organizations/Index', {
      organizations,
      meta: result.success ? result.data?.meta : { total: 0, page: 1, limit: 20, totalPages: 0 },
      error: result.success ? null : result.message,
    })
  }
}
