import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Path: `/manager/dashboard`
 * React Page: `Manager/Dashboard/Index`
 *
 * Spec §2 異常狀態：manager 無有效 org → redirect /member/dashboard（無組織的空白引導頁）
 */
export class ManagerDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly balanceService: GetBalanceService,
    private readonly listApiKeysService: ListApiKeysService,
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const membership = await this.memberRepository.findByUserId(auth.userId)
    if (!membership) {
      return ctx.redirect('/member/dashboard')
    }
    const orgId = membership.organizationId

    const [balanceResult, listResult] = await Promise.all([
      this.balanceService.execute(orgId, auth.userId, auth.role),
      this.listApiKeysService.execute(orgId, auth.userId, auth.role, 1, 100),
    ])

    return this.inertia.render(ctx, 'Manager/Dashboard/Index', {
      orgId,
      balance: balanceResult.success ? (balanceResult.data ?? null) : null,
      keys: listResult.success ? (listResult.data?.keys ?? []) : [],
      error:
        balanceResult.success && listResult.success
          ? null
          : { key: 'manager.dashboard.loadFailed' },
    })
  }
}
