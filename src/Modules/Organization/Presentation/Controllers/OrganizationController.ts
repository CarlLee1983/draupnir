import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { AcceptInvitationService } from '../../Application/Services/AcceptInvitationService'
import type { CancelInvitationService } from '../../Application/Services/CancelInvitationService'
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
    return ctx.json(result, result.success ? 201 : 400)
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
}
