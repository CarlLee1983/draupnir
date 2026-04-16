import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { InviteMemberService } from '@/Modules/Organization/Application/Services/InviteMemberService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { RemoveMemberService } from '@/Modules/Organization/Application/Services/RemoveMemberService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

interface MemberRow {
  userId: string
  role: string
  joinedAt: string
  assignedKeys: string[]
}

/**
 * Path: `/manager/members`
 * React Page: `Manager/Members/Index`
 *
 * 功能：列出成員、產生邀請、移除成員（移除時該成員被指派的 key 會自動解除指派，key 本身保留）。
 */
export class ManagerMembersPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listMembersService: ListMembersService,
    private readonly inviteMemberService: InviteMemberService,
    private readonly removeMemberService: RemoveMemberService,
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  private async resolveOrgId(
    ctx: IHttpContext,
  ): Promise<{ orgId: string } | { redirect: Response }> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const membership = await this.memberRepository.findByUserId(auth.userId)
    if (!membership) return { redirect: ctx.redirect('/member/dashboard') }
    return { orgId: membership.organizationId }
  }

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const resolve = await this.resolveOrgId(ctx)
    if ('redirect' in resolve) return resolve.redirect
    const { orgId } = resolve

    const [listResult, keys] = await Promise.all([
      this.listMembersService.execute(orgId, auth.userId, auth.role),
      this.apiKeyRepository.findByOrgId(orgId),
    ])

    const assignedByUser = new Map<string, string[]>()
    for (const k of keys) {
      if (k.assignedMemberId) {
        const arr = assignedByUser.get(k.assignedMemberId) ?? []
        arr.push(k.label)
        assignedByUser.set(k.assignedMemberId, arr)
      }
    }

    const members: MemberRow[] = listResult.success
      ? ((listResult.data?.members ?? []) as Array<{
          userId: string
          role: string
          joinedAt: string
        }>).map((m) => ({
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          assignedKeys: assignedByUser.get(m.userId) ?? [],
        }))
      : []

    return this.inertia.render(ctx, 'Manager/Members/Index', {
      orgId,
      members,
      error: listResult.success ? null : { key: 'manager.members.loadFailed' },
    })
  }

  async invite(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const resolve = await this.resolveOrgId(ctx)
    if ('redirect' in resolve) return resolve.redirect
    const body = ctx.get('validated') as { email?: string; role?: string } | undefined
    await this.inviteMemberService.execute(resolve.orgId, auth.userId, auth.role, {
      email: body?.email ?? '',
      role: body?.role ?? 'member',
    })
    return ctx.redirect('/manager/members')
  }

  async remove(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const resolve = await this.resolveOrgId(ctx)
    if ('redirect' in resolve) return resolve.redirect
    const targetUserId = ctx.getParam('userId') ?? ''
    await this.removeMemberService.execute(resolve.orgId, targetUserId, auth.userId, auth.role)
    return ctx.redirect('/manager/members')
  }
}
