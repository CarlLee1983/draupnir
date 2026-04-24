import type { AssignApiKeyService } from '@/Modules/ApiKey/Application/Services/AssignApiKeyService'
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { RevokeApiKeyService } from '@/Modules/ApiKey/Application/Services/RevokeApiKeyService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Path: `/manager/api-keys`
 * React Page: `Manager/ApiKeys/Index`
 *
 * 功能：列表、指派切換、撤銷。
 * v1：僅允許指派給 role=member 的組織成員。
 */
export class ManagerApiKeysPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listApiKeysService: ListApiKeysService,
    private readonly listMembersService: ListMembersService,
    private readonly assignApiKeyService: AssignApiKeyService,
    private readonly revokeApiKeyService: RevokeApiKeyService,
    private readonly membershipService: GetUserMembershipService,
  ) {}

  private async resolveOrgId(
    ctx: IHttpContext,
  ): Promise<{ orgId: string } | { redirect: Response }> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const membership = await this.membershipService.execute(auth.userId)
    if (!membership) return { redirect: ctx.redirect('/member/dashboard') }
    return { orgId: membership.orgId }
  }

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const r = await this.resolveOrgId(ctx)
    if ('redirect' in r) return r.redirect

    const [list, members] = await Promise.all([
      this.listApiKeysService.execute(r.orgId, auth.userId, auth.role, 1, 100),
      this.listMembersService.execute(r.orgId, auth.userId, auth.role),
    ])

    const assignees = members.success
      ? ((members.data?.members ?? []) as Array<{ userId: string; role: string; email?: string }>)
          .filter((m) => m.role === 'member')
          .map((m) => ({
            userId: m.userId,
            email: typeof m.email === 'string' ? m.email : '',
          }))
      : []

    return this.inertia.render(ctx, 'Manager/ApiKeys/Index', {
      orgId: r.orgId,
      keys: list.success ? (list.data?.keys ?? []) : [],
      assignees,
      error: list.success && members.success ? null : { key: 'manager.apiKeys.loadFailed' },
    })
  }

  async assign(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const r = await this.resolveOrgId(ctx)
    if ('redirect' in r) return r.redirect
    const keyId = ctx.getParam('keyId') ?? ''
    const body = ctx.get('validated') as { assigneeUserId?: string | null } | undefined
    await this.assignApiKeyService.execute({
      keyId,
      orgId: r.orgId,
      assigneeUserId: body?.assigneeUserId ?? null,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    return ctx.redirect('/manager/api-keys')
  }

  async revoke(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const r = await this.resolveOrgId(ctx)
    if ('redirect' in r) return r.redirect
    const keyId = ctx.getParam('keyId') ?? ''
    await this.revokeApiKeyService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    return ctx.redirect('/manager/api-keys')
  }
}
