import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { ListAdminContractsService } from '@/Modules/Contract/Application/Services/ListAdminContractsService'
import type { GetAdminPlatformUsageTrendService } from '@/Modules/Dashboard/Application/Services/GetAdminPlatformUsageTrendService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

const DEFAULT_ADMIN_USAGE_WINDOW: 7 | 15 | 30 = 15

function parseAdminUsageWindowDays(ctx: IHttpContext): 7 | 15 | 30 {
  const raw = ctx.getQuery('days')
  if (raw === undefined) return DEFAULT_ADMIN_USAGE_WINDOW
  const n = parseInt(raw, 10)
  if (n === 7 || n === 15 || n === 30) return n
  return DEFAULT_ADMIN_USAGE_WINDOW
}

/**
 * Admin home: aggregate counts for users, organizations, and contracts (`Admin/Dashboard/Index`).
 */
export class AdminDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listUsersService: ListUsersService,
    private readonly listOrgsService: ListOrganizationsService,
    private readonly listAdminContractsService: ListAdminContractsService,
    private readonly adminUsageTrendService: GetAdminPlatformUsageTrendService,
  ) {}

  /**
   * @param ctx - HTTP context after JWT middleware.
   * @returns Inertia response with summary totals.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const usageWindowDays = parseAdminUsageWindowDays(ctx)

    const [usersResult, orgsResult, contractsResult, usageTrendResult] = await Promise.all([
      this.listUsersService.execute({ page: 1, limit: 1 }),
      this.listOrgsService.execute(1, 1),
      this.listAdminContractsService.execute({ callerRole: auth.role, page: 1, limit: 1 }),
      this.adminUsageTrendService.execute(usageWindowDays),
    ])

    const totals = {
      users: usersResult.success ? (usersResult.data?.meta?.total ?? 0) : 0,
      organizations: orgsResult.success ? (orgsResult.data?.meta?.total ?? 0) : 0,
      contracts: contractsResult.success ? (contractsResult.data?.meta?.total ?? 0) : 0,
    }

    const isAllZeros =
      usageTrendResult.success &&
      usageTrendResult.data.points.every((p) => p.requests === 0 && p.tokens === 0)

    let usageTrend = usageTrendResult.success
      ? usageTrendResult.data.points.map((p) => ({
          date: p.date,
          requests: p.requests,
          tokens: p.tokens,
        }))
      : []

    let isUsageTrendDemo = false

    if (usageTrend.length > 0 && isAllZeros) {
      isUsageTrendDemo = true
      usageTrend = usageTrend.map((p, index) => {
        const dayFactor = 1 + (index / usageTrend.length) * 0.3 // 30% upward trend
        const randomFactor = 0.9 + Math.random() * 0.2 // 20% variance
        const requests = Math.floor((500 + Math.random() * 1000) * dayFactor * randomFactor)
        const tokens = Math.floor(requests * (200 + Math.random() * 100))
        return { ...p, requests, tokens }
      })
    }

    return this.inertia.render(ctx, 'Admin/Dashboard/Index', {
      totals,
      usageTrend,
      usageWindowDays,
      isUsageTrendDemo,
    })
  }
}
