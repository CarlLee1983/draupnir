import type { AssignApiKeyService } from '@/Modules/ApiKey/Application/Services/AssignApiKeyService'
import type { CreateApiKeyService } from '@/Modules/ApiKey/Application/Services/CreateApiKeyService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

interface CreateForm {
  label: string
  quotaAllocated?: number
  budgetResetPeriod?: '7d' | '30d'
  assigneeUserId?: string | null
}

/**
 * Paths:
 *  - GET  `/manager/api-keys/create` → 顯示建立表單
 *  - POST `/manager/api-keys`       → 建立 key（+ optional 指派）
 */
export class ManagerApiKeyCreatePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly createApiKeyService: CreateApiKeyService,
    private readonly assignApiKeyService: AssignApiKeyService,
    private readonly listMembersService: ListMembersService,
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  private async resolveOrgId(
    ctx: IHttpContext,
  ): Promise<{ orgId: string } | { redirect: Response }> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const m = await this.memberRepository.findByUserId(auth.userId)
    if (!m) return { redirect: ctx.redirect('/member/dashboard') }
    return { orgId: m.organizationId }
  }

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const r = await this.resolveOrgId(ctx)
    if ('redirect' in r) return r.redirect
    const members = await this.listMembersService.execute(r.orgId, auth.userId, auth.role)
    const assignees = members.success
      ? ((members.data?.members ?? []) as Array<{ userId: string; role: string }>)
          .filter((m) => m.role === 'member')
          .map((m) => ({ userId: m.userId }))
      : []
    return this.inertia.render(ctx, 'Manager/ApiKeys/Create', {
      orgId: r.orgId,
      assignees,
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const r = await this.resolveOrgId(ctx)
    if ('redirect' in r) return r.redirect
    const body = (ctx.get('validated') as CreateForm | undefined) ?? { label: '' }

    const created = await this.createApiKeyService.execute({
      orgId: r.orgId,
      createdByUserId: auth.userId,
      callerSystemRole: auth.role,
      label: body.label,
      budgetMaxLimit: body.quotaAllocated,
      budgetResetPeriod: body.budgetResetPeriod,
    })

    const createdKeyId =
      created.success && created.data && typeof created.data.id === 'string'
        ? (created.data.id as string)
        : null

    if (!createdKeyId) {
      return ctx.redirect('/manager/api-keys/create')
    }

    if (body.assigneeUserId && body.assigneeUserId.length > 0) {
      await this.assignApiKeyService.execute({
        keyId: createdKeyId,
        orgId: r.orgId,
        assigneeUserId: body.assigneeUserId,
        callerUserId: auth.userId,
        callerSystemRole: auth.role,
      })
    }

    return ctx.redirect('/manager/api-keys')
  }
}
