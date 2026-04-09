import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import type { ListAdminContractsService } from '@/Modules/Contract/Application/Services/ListAdminContractsService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listUsersService: ListUsersService,
    private readonly listOrgsService: ListOrganizationsService,
    private readonly listAdminContractsService: ListAdminContractsService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const auth = check.auth!

    const [usersResult, orgsResult, contractsResult] = await Promise.all([
      this.listUsersService.execute({ page: 1, limit: 1 }),
      this.listOrgsService.execute(1, 1),
      this.listAdminContractsService.execute({ callerRole: auth.role, page: 1, limit: 1 }),
    ])

    const totals = {
      users: usersResult.success ? usersResult.data?.meta?.total ?? 0 : 0,
      organizations: orgsResult.success ? orgsResult.data?.meta?.total ?? 0 : 0,
      contracts: contractsResult.success ? contractsResult.data?.meta?.total ?? 0 : 0,
    }

    return this.inertia.render(ctx, 'Admin/Dashboard/Index', {
      totals,
    })
  }
}
