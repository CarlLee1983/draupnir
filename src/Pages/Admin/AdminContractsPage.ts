import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { ListAdminContractsService } from '@/Modules/Contract/Application/Services/ListAdminContractsService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminContractsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listAdminContractsService: ListAdminContractsService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const auth = check.auth!
    const page = parseInt(ctx.getQuery('page') ?? '1', 10)
    const limit = parseInt(ctx.getQuery('limit') ?? '20', 10)
    const status = ctx.getQuery('status')

    const result = await this.listAdminContractsService.execute({
      callerRole: auth.role,
      page,
      limit,
      status: status ?? undefined,
    })

    const contracts =
      result.success && result.data?.contracts
        ? result.data.contracts.map((c) => {
            const row = c as Record<string, unknown>
            const terms = row.terms as {
              validityPeriod: { startDate: string; endDate: string }
            }
            const tid = String(row.targetId ?? '')
            const label =
              tid.length > 10 ? `${String(row.targetType)} · ${tid.slice(0, 8)}…` : `${String(row.targetType)} · ${tid}`
            return {
              id: row.id as string,
              name: label,
              status: row.status as 'draft' | 'active' | 'expired' | 'terminated',
              targetType: row.targetType as 'organization' | 'user',
              targetId: tid,
              startDate: terms.validityPeriod.startDate,
              endDate: terms.validityPeriod.endDate,
            }
          })
        : []

    return this.inertia.render(ctx, 'Admin/Contracts/Index', {
      contracts,
      meta: result.success ? result.data?.meta : { total: 0, page: 1, limit: 20, totalPages: 0 },
      error: result.success ? null : result.message,
    })
  }
}
