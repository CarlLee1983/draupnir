import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { UpdateOrganizationService } from '@/Modules/Organization/Application/Services/UpdateOrganizationService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Path: `/manager/organization`
 * React Page: `Manager/Organization/Index`
 *
 * 顯示組織資訊與合約配額（唯讀），manager 可更新組織名稱/描述。
 */
export class ManagerOrganizationPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getOrganizationService: GetOrganizationService,
    private readonly listContractsService: ListContractsService,
    private readonly updateOrganizationService: UpdateOrganizationService,
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const membership = await this.memberRepository.findByUserId(auth.userId)
    if (!membership) return ctx.redirect('/member/dashboard')

    const orgId = membership.organizationId
    const [org, contracts] = await Promise.all([
      this.getOrganizationService.execute(orgId, auth.userId, auth.role),
      this.listContractsService.execute(orgId, auth.userId, auth.role),
    ])

    return this.inertia.render(ctx, 'Manager/Organization/Index', {
      orgId,
      organization: org.success ? (org.data ?? null) : null,
      contracts: contracts.success ? (contracts.data ?? []) : [],
      error:
        org.success && contracts.success ? null : { key: 'manager.organization.loadFailed' },
    })
  }

  async update(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const membership = await this.memberRepository.findByUserId(auth.userId)
    if (!membership) return ctx.redirect('/member/dashboard')

    const body = ctx.get('validated') as { name?: string; description?: string } | undefined
    const result = await this.updateOrganizationService.execute(
      membership.organizationId,
      { name: body?.name ?? '', description: body?.description ?? '' },
      auth.userId,
      auth.role,
    )
    if (!result.success) {
      ctx.set('__pending_flash__', { key: 'manager.organization.updateFailed' })
    }
    return ctx.redirect('/manager/organization')
  }
}
