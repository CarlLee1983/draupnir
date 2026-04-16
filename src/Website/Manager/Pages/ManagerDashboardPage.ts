import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { SumQuotaAllocatedForOrgService } from '@/Modules/ApiKey/Application/Services/SumQuotaAllocatedForOrgService'
import type { GetActiveOrgContractQuotaService } from '@/Modules/Contract/Application/Services/GetActiveOrgContractQuotaService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Path: `/manager/dashboard`
 * React Page: `Manager/Dashboard/Index`
 *
 * 組織「餘額」對標作用中合約的 `creditQuota`；已配發配額為作用中 API keys 的
 * `quota_allocated` 總和（與 `AdjustContractQuotaService` 一致）。
 *
 * Spec §2 異常狀態：manager 無有效 org → redirect /member/dashboard（無組織的空白引導頁）
 */
export class ManagerDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly orgContractQuotaService: GetActiveOrgContractQuotaService,
    private readonly sumAllocatedService: SumQuotaAllocatedForOrgService,
    private readonly listApiKeysService: ListApiKeysService,
    private readonly membershipService: GetUserMembershipService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const membership = await this.membershipService.execute(auth.userId)
    if (!membership) {
      return ctx.redirect('/member/dashboard')
    }
    const { orgId } = membership

    const [quotaResult, allocatedResult, listResult] = await Promise.all([
      this.orgContractQuotaService.execute(orgId, auth.userId, auth.role),
      this.sumAllocatedService.execute(orgId, auth.userId, auth.role),
      this.listApiKeysService.execute(orgId, auth.userId, auth.role, 1, 100),
    ])

    const allOk = quotaResult.success && allocatedResult.success && listResult.success

    return this.inertia.render(ctx, 'Manager/Dashboard/Index', {
      orgId,
      contractQuota: quotaResult.success ? (quotaResult.data?.contractQuota ?? null) : null,
      totalAllocated: allocatedResult.success ? (allocatedResult.data?.totalAllocated ?? null) : null,
      keys: listResult.success ? (listResult.data?.keys ?? []) : [],
      error: allOk ? null : { key: 'manager.dashboard.loadFailed' },
    })
  }
}
