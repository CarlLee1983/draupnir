import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { ListAdminContractsService } from '@/Modules/Contract/Application/Services/ListAdminContractsService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

/**
 * Admin home: aggregate counts for users, organizations, and contracts (`Admin/Dashboard/Index`).
 */
export class AdminDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listUsersService: ListUsersService,
    private readonly listOrgsService: ListOrganizationsService,
    private readonly listAdminContractsService: ListAdminContractsService,
  ) {}

  /**
   * @param ctx - HTTP context after JWT middleware.
   * @returns Inertia response with summary totals.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    const [usersResult, orgsResult, contractsResult] = await Promise.all([
      this.listUsersService.execute({ page: 1, limit: 1 }),
      this.listOrgsService.execute(1, 1),
      this.listAdminContractsService.execute({ callerRole: auth.role, page: 1, limit: 1 }),
    ])

    const totals = {
      users: usersResult.success ? (usersResult.data?.meta?.total ?? 0) : 0,
      organizations: orgsResult.success ? (orgsResult.data?.meta?.total ?? 0) : 0,
      contracts: contractsResult.success ? (contractsResult.data?.meta?.total ?? 0) : 0,
    }

    return this.inertia.render(ctx, 'Admin/Dashboard/Index', {
      totals,
    })
  }
}
