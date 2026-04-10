import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireAdmin } from './helpers/requireAdmin'

/**
 * Admin user directory with filters and pagination (`Admin/Users/Index`).
 */
export class AdminUsersPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListUsersService,
  ) {}

  /**
   * @param ctx - Query: `page`, `limit`, `keyword`, `role`, `status`.
   * @returns Inertia list payload or auth failure response.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const page = parseInt(ctx.getQuery('page') ?? '1', 10)
    const limit = parseInt(ctx.getQuery('limit') ?? '20', 10)
    const keyword = ctx.getQuery('keyword')
    const role = ctx.getQuery('role')
    const status = ctx.getQuery('status')

    const result = await this.listService.execute({ page, limit, keyword, role, status })

    const users =
      result.success && result.data?.users
        ? result.data.users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.displayName,
            role: u.role as 'admin' | 'manager' | 'member',
            status: u.status as 'active' | 'inactive' | 'suspended',
            createdAt: u.createdAt,
          }))
        : []

    return this.inertia.render(ctx, 'Admin/Users/Index', {
      users,
      meta: result.success ? result.data?.meta : { total: 0, page: 1, limit: 20, totalPages: 0 },
      filters: { keyword: keyword ?? '', role: role ?? '', status: status ?? '' },
      error: result.success ? null : result.message,
    })
  }
}
