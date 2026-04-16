import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { InviteMemberService } from '@/Modules/Organization/Application/Services/InviteMemberService'
import type { ListInvitationsService } from '@/Modules/Organization/Application/Services/ListInvitationsService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { RemoveMemberService } from '@/Modules/Organization/Application/Services/RemoveMemberService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { setFlash } from '@/Website/Http/Inertia/SharedPropsBuilder'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

interface MemberRow {
  userId: string
  email: string
  role: string
  joinedAt: string
  assignedKeys: string[]
}

/** 邀請中（pending 且未過期），不含 token。 */
interface PendingInvitationRow {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
}

/**
 * Path: `/manager/members`
 * React Page: `Manager/Members/Index`
 *
 * 功能：列出成員、邀請中清單、產生邀請、移除成員（移除時該成員被指派的 key 會自動解除指派，key 本身保留）。
 */
export class ManagerMembersPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listMembersService: ListMembersService,
    private readonly inviteMemberService: InviteMemberService,
    private readonly removeMemberService: RemoveMemberService,
    private readonly listApiKeysService: ListApiKeysService,
    private readonly membershipService: GetUserMembershipService,
    private readonly listInvitationsService: ListInvitationsService,
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
    const resolve = await this.resolveOrgId(ctx)
    if ('redirect' in resolve) return resolve.redirect
    const { orgId } = resolve

    const [listResult, keysResult, invResult] = await Promise.all([
      this.listMembersService.execute(orgId, auth.userId, auth.role),
      this.listApiKeysService.execute(orgId, auth.userId, auth.role, 1, 1000),
      this.listInvitationsService.execute(orgId, auth.userId, auth.role),
    ])

    const assignedByUser = new Map<string, string[]>()
    if (keysResult.success && keysResult.data?.keys) {
      for (const k of keysResult.data.keys as Array<Record<string, unknown>>) {
        const assignedMemberId = k.assignedMemberId as string | null | undefined
        if (assignedMemberId) {
          const arr = assignedByUser.get(assignedMemberId) ?? []
          arr.push(k.label as string)
          assignedByUser.set(assignedMemberId, arr)
        }
      }
    }

    const members: MemberRow[] = listResult.success
      ? ((listResult.data?.members ?? []) as Array<{
          userId: string
          email?: string
          role: string
          joinedAt: string
        }>).map((m) => ({
          userId: m.userId,
          email: typeof m.email === 'string' ? m.email : '',
          role: m.role,
          joinedAt: m.joinedAt,
          assignedKeys: assignedByUser.get(m.userId) ?? [],
        }))
      : []

    const now = Date.now()
    const pendingInvitations: PendingInvitationRow[] =
      invResult.success && invResult.data?.invitations
        ? (invResult.data.invitations as Array<Record<string, unknown>>)
            .filter(
              (row) =>
                row.status === 'pending' &&
                typeof row.expiresAt === 'string' &&
                new Date(row.expiresAt).getTime() > now,
            )
            .map((row) => ({
              id: String(row.id),
              email: String(row.email),
              role: String(row.role),
              expiresAt: String(row.expiresAt),
              createdAt: String(row.createdAt),
            }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : []

    return this.inertia.render(ctx, 'Manager/Members/Index', {
      orgId,
      members,
      pendingInvitations,
      error: listResult.success ? null : { key: 'manager.members.loadFailed' },
      invitationsError: invResult.success ? null : { key: 'manager.members.invitationsLoadFailed' },
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
    if (targetUserId === auth.userId) {
      setFlash(ctx, 'error', { key: 'manager.members.cannotRemoveSelf' })
      return ctx.redirect('/manager/members')
    }
    await this.removeMemberService.execute(resolve.orgId, targetUserId, auth.userId, auth.role)
    return ctx.redirect('/manager/members')
  }
}
