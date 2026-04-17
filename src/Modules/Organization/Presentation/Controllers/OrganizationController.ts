import type { IJwtTokenService } from '@/Modules/Auth/Application/Ports/IJwtTokenService'
import { sha256 } from '@/Modules/Auth/Application/Utils/sha256'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import { isSecureRequest } from '@/Shared/Infrastructure/Http/isSecureRequest'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { dashboardPathForWebRole } from '@/Website/Auth/dashboardPathForWebRole'
import type { AcceptInvitationByIdService } from '../../Application/Services/AcceptInvitationByIdService'
import type { AcceptInvitationService } from '../../Application/Services/AcceptInvitationService'
import type { CancelInvitationService } from '../../Application/Services/CancelInvitationService'
import type { DeclineInvitationService } from '../../Application/Services/DeclineInvitationService'
import type { ChangeOrgMemberRoleService } from '../../Application/Services/ChangeOrgMemberRoleService'
import type { ChangeOrgStatusService } from '../../Application/Services/ChangeOrgStatusService'
import type { CreateOrganizationService } from '../../Application/Services/CreateOrganizationService'
import type { GetOrganizationService } from '../../Application/Services/GetOrganizationService'
import type { InviteMemberService } from '../../Application/Services/InviteMemberService'
import type { ListInvitationsService } from '../../Application/Services/ListInvitationsService'
import type { ListMembersService } from '../../Application/Services/ListMembersService'
import type { ListOrganizationsService } from '../../Application/Services/ListOrganizationsService'
import type { RemoveMemberService } from '../../Application/Services/RemoveMemberService'
import type { UpdateOrganizationService } from '../../Application/Services/UpdateOrganizationService'
import type {
  AcceptInvitationParams,
  ChangeMemberRoleParams,
  ChangeOrgStatusParams,
  CreateOrganizationParams,
  InviteMemberParams,
  UpdateOrganizationParams,
} from '../Requests'
import {
  OrganizationIdSchema,
  OrganizationInvitationParamsSchema,
  OrganizationMemberParamsSchema,
} from '../Requests'

function resolveCurrentOrganizationId(ctx: IHttpContext): string | null {
  const currentOrg = ctx.get<{ organizationId?: string }>('currentOrg')
  if (currentOrg?.organizationId) {
    return currentOrg.organizationId
  }
  return ctx.getParam('id') ?? ctx.getParam('orgId') ?? null
}

function validateOrganizationId(
  ctx: IHttpContext,
): { ok: true; orgId: string } | { ok: false; response: Response } {
  const validation = OrganizationIdSchema.safeParse({ id: resolveCurrentOrganizationId(ctx) })
  if (!validation.success) {
    return {
      ok: false,
      response: ctx.json(
        {
          success: false,
          message: 'Validation failed',
          error: validation.error.issues[0]?.message ?? 'Invalid organization ID',
        },
        400,
      ),
    }
  }
  return { ok: true, orgId: validation.data.id }
}

function validateOrganizationMemberParams(
  ctx: IHttpContext,
): { ok: true; orgId: string; userId: string } | { ok: false; response: Response } {
  const validation = OrganizationMemberParamsSchema.safeParse({
    id: resolveCurrentOrganizationId(ctx),
    userId: ctx.getParam('userId'),
  })
  if (!validation.success) {
    return {
      ok: false,
      response: ctx.json(
        {
          success: false,
          message: 'Validation failed',
          error: validation.error.issues[0]?.message ?? 'Invalid parameter',
        },
        400,
      ),
    }
  }
  return { ok: true, orgId: validation.data.id, userId: validation.data.userId }
}

function validateInvitationParams(
  ctx: IHttpContext,
): { ok: true; orgId: string; invId: string } | { ok: false; response: Response } {
  const validation = OrganizationInvitationParamsSchema.safeParse({
    id: resolveCurrentOrganizationId(ctx),
    invId: ctx.getParam('invId'),
  })
  if (!validation.success) {
    return {
      ok: false,
      response: ctx.json(
        {
          success: false,
          message: 'Validation failed',
          error: validation.error.issues[0]?.message ?? 'Invalid parameter',
        },
        400,
      ),
    }
  }
  return { ok: true, orgId: validation.data.id, invId: validation.data.invId }
}

export class OrganizationController {
  constructor(
    private createOrgService: CreateOrganizationService,
    private updateOrgService: UpdateOrganizationService,
    private listOrgsService: ListOrganizationsService,
    private inviteMemberService: InviteMemberService,
    private acceptInvitationService: AcceptInvitationService,
    private removeMemberService: RemoveMemberService,
    private listMembersService: ListMembersService,
    private changeRoleService: ChangeOrgMemberRoleService,
    private getOrgService: GetOrganizationService,
    private changeOrgStatusService: ChangeOrgStatusService,
    private listInvitationsService: ListInvitationsService,
    private cancelInvitationService: CancelInvitationService,
  private acceptInvitationByIdService: AcceptInvitationByIdService,
  private declineInvitationService: DeclineInvitationService,
  private jwtTokenService: IJwtTokenService,
  private authTokenRepository: IAuthTokenRepository,
  ) {}

  async create(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }
    const body = ctx.get('validated') as CreateOrganizationParams
    const result = await this.createOrgService.execute({
      ...body,
      managerUserId: auth.userId,
    })

    if (result.success) {
      // Rotate access JWT：role 從 member 升為 manager，舊 token 還帶著舊 role，
      // 必須在此路由簽新 access token 並以 httpOnly cookie 回寫，讓 downstream
      // 導頁到 /manager/dashboard 時不會被 requireManager middleware 退回。
      const accessToken = this.jwtTokenService.signAccessToken({
        userId: auth.userId,
        email: auth.email,
        role: 'manager',
        permissions: [],
      })
      const tokenStr = accessToken.getValue()
      // AuthMiddleware.isRevoked fails closed：token hash 必須存在 auth_tokens 才不會被視為 revoked。
      // 與 LoginUserService.execute 保持一致（只 rotate access，不 rotate refresh）。
      const tokenHash = await sha256(tokenStr)
      await this.authTokenRepository.save({
        id: crypto.randomUUID(),
        userId: auth.userId,
        tokenHash,
        type: 'access',
        expiresAt: accessToken.getExpiresAt(),
        createdAt: new Date(),
      })
      ctx.setCookie('auth_token', tokenStr, {
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: 900,
        secure: isSecureRequest(ctx),
      })
      return ctx.json(
        {
          ...result,
          data: {
            ...(result.data ?? {}),
            redirectTo: dashboardPathForWebRole('manager'),
          },
        },
        201,
      )
    }

    return ctx.json(result, 400)
  }

  async list(ctx: IHttpContext): Promise<Response> {
    const page = ctx.getQuery('page') ? Number(ctx.getQuery('page')) : 1
    const limit = ctx.getQuery('limit') ? Number(ctx.getQuery('limit')) : 20
    const result = await this.listOrgsService.execute(page, limit)
    return ctx.json(result, 200)
  }

  async get(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized' }, 401)
    const validated = validateOrganizationId(ctx)
    if (!validated.ok) return validated.response
    const orgId = validated.orgId
    const result = await this.getOrgService.execute(orgId, auth.userId, auth.role)
    return ctx.json(result, result.success ? 200 : 404)
  }

  async update(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized' }, 401)
    const validated = validateOrganizationId(ctx)
    if (!validated.ok) return validated.response
    const orgId = validated.orgId
    const body = ctx.get('validated') as UpdateOrganizationParams
    const result = await this.updateOrgService.execute(orgId, body, auth.userId, auth.role)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async changeStatus(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized' }, 401)
    const validated = validateOrganizationId(ctx)
    if (!validated.ok) return validated.response
    const orgId = validated.orgId
    const body = ctx.get('validated') as ChangeOrgStatusParams
    const result = await this.changeOrgStatusService.execute(orgId, body.status, auth.userId, auth.role)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async listMembers(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized' }, 401)
    const validated = validateOrganizationId(ctx)
    if (!validated.ok) return validated.response
    const orgId = validated.orgId
    const result = await this.listMembersService.execute(orgId, auth.userId, auth.role)
    return ctx.json(result, 200)
  }

  async invite(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized' }, 401)
    const validated = validateOrganizationId(ctx)
    if (!validated.ok) return validated.response
    const orgId = validated.orgId
    const body = ctx.get('validated') as InviteMemberParams
    const result = await this.inviteMemberService.execute(orgId, auth.userId, auth.role, body)
    return ctx.json(result, result.success ? 201 : 400)
  }

  async acceptInvitation(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized' }, 401)
    const body = ctx.get('validated') as AcceptInvitationParams
    const result = await this.acceptInvitationService.execute(auth.userId, body)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async removeMember(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized' }, 401)
    const validated = validateOrganizationMemberParams(ctx)
    if (!validated.ok) return validated.response
    const orgId = validated.orgId
    const userId = validated.userId
    const result = await this.removeMemberService.execute(orgId, userId, auth.userId, auth.role)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async changeMemberRole(ctx: IHttpContext): Promise<Response> {
    const validated = validateOrganizationMemberParams(ctx)
    if (!validated.ok) return validated.response
    const orgId = validated.orgId
    const userId = validated.userId
    const body = ctx.get('validated') as ChangeMemberRoleParams
    const result = await this.changeRoleService.execute(orgId, userId, body.role)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async listInvitations(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized' }, 401)
    const validated = validateOrganizationId(ctx)
    if (!validated.ok) return validated.response
    const orgId = validated.orgId
    const result = await this.listInvitationsService.execute(orgId, auth.userId, auth.role)
    return ctx.json(result, 200)
  }

  async cancelInvitation(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized' }, 401)
    const validated = validateInvitationParams(ctx)
    if (!validated.ok) return validated.response
    const orgId = validated.orgId
    const invId = validated.invId
    const result = await this.cancelInvitationService.execute(orgId, invId, auth.userId, auth.role)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async acceptInvitationById(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const invitationId = ctx.getParam('id')
    if (!invitationId) {
      return ctx.json({ success: false, message: 'Missing invitation ID', error: 'ID_REQUIRED' }, 400)
    }
    const result = await this.acceptInvitationByIdService.execute(invitationId, auth.userId)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async declineInvitation(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const invitationId = ctx.getParam('id')
    if (!invitationId) {
      return ctx.json({ success: false, message: 'Missing invitation ID', error: 'ID_REQUIRED' }, 400)
    }
    const result = await this.declineInvitationService.execute(invitationId, auth.userId)
    return ctx.json(result, result.success ? 200 : 400)
  }
}
