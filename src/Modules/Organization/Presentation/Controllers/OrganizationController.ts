import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { CreateOrganizationService } from '../../Application/Services/CreateOrganizationService'
import type { UpdateOrganizationService } from '../../Application/Services/UpdateOrganizationService'
import type { ListOrganizationsService } from '../../Application/Services/ListOrganizationsService'
import type { InviteMemberService } from '../../Application/Services/InviteMemberService'
import type { AcceptInvitationService } from '../../Application/Services/AcceptInvitationService'
import type { RemoveMemberService } from '../../Application/Services/RemoveMemberService'
import type { ListMembersService } from '../../Application/Services/ListMembersService'
import type { ChangeOrgMemberRoleService } from '../../Application/Services/ChangeOrgMemberRoleService'
import type { GetOrganizationService } from '../../Application/Services/GetOrganizationService'
import type { ChangeOrgStatusService } from '../../Application/Services/ChangeOrgStatusService'
import type { ListInvitationsService } from '../../Application/Services/ListInvitationsService'
import type { CancelInvitationService } from '../../Application/Services/CancelInvitationService'

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
		const body = await ctx.getJsonBody<{
			name: string
			description?: string
			slug?: string
			managerUserId: string
		}>()
		const result = await this.createOrgService.execute(body)
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
		if (!auth) return ctx.json({ success: false, message: '未經授權' }, 401)
		const orgId = ctx.getParam('id')
		if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
		const result = await this.getOrgService.execute(orgId, auth.userId, auth.role)
		return ctx.json(result, result.success ? 200 : 404)
	}

	async update(ctx: IHttpContext): Promise<Response> {
		const orgId = ctx.getParam('id')
		if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
		const body = await ctx.getJsonBody<{ name?: string; description?: string }>()
		const result = await this.updateOrgService.execute(orgId, body)
		return ctx.json(result, result.success ? 200 : 400)
	}

	async changeStatus(ctx: IHttpContext): Promise<Response> {
		const orgId = ctx.getParam('id')
		if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
		const body = await ctx.getJsonBody<{ status: 'active' | 'suspended' }>()
		const result = await this.changeOrgStatusService.execute(orgId, body.status)
		return ctx.json(result, result.success ? 200 : 400)
	}

	async listMembers(ctx: IHttpContext): Promise<Response> {
		const auth = AuthMiddleware.getAuthContext(ctx)
		if (!auth) return ctx.json({ success: false, message: '未經授權' }, 401)
		const orgId = ctx.getParam('id')
		if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
		const result = await this.listMembersService.execute(orgId, auth.userId, auth.role)
		return ctx.json(result, 200)
	}

	async invite(ctx: IHttpContext): Promise<Response> {
		const auth = AuthMiddleware.getAuthContext(ctx)
		if (!auth) return ctx.json({ success: false, message: '未經授權' }, 401)
		const orgId = ctx.getParam('id')
		if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
		const body = await ctx.getJsonBody<{ email: string; role?: string }>()
		const result = await this.inviteMemberService.execute(orgId, auth.userId, auth.role, body)
		return ctx.json(result, result.success ? 201 : 400)
	}

	async acceptInvitation(ctx: IHttpContext): Promise<Response> {
		const auth = AuthMiddleware.getAuthContext(ctx)
		if (!auth) return ctx.json({ success: false, message: '未經授權' }, 401)
		const token = ctx.getParam('token')
		if (!token) return ctx.json({ success: false, message: '缺少 Token' }, 400)
		const result = await this.acceptInvitationService.execute(auth.userId, { token })
		return ctx.json(result, result.success ? 200 : 400)
	}

	async removeMember(ctx: IHttpContext): Promise<Response> {
		const auth = AuthMiddleware.getAuthContext(ctx)
		if (!auth) return ctx.json({ success: false, message: '未經授權' }, 401)
		const orgId = ctx.getParam('id')
		const userId = ctx.getParam('userId')
		if (!orgId || !userId) return ctx.json({ success: false, message: '缺少參數' }, 400)
		const result = await this.removeMemberService.execute(orgId, userId, auth.userId, auth.role)
		return ctx.json(result, result.success ? 200 : 400)
	}

	async changeMemberRole(ctx: IHttpContext): Promise<Response> {
		const orgId = ctx.getParam('id')
		const userId = ctx.getParam('userId')
		if (!orgId || !userId) return ctx.json({ success: false, message: '缺少參數' }, 400)
		const body = await ctx.getJsonBody<{ role: string }>()
		const result = await this.changeRoleService.execute(orgId, userId, body.role)
		return ctx.json(result, result.success ? 200 : 400)
	}

	async listInvitations(ctx: IHttpContext): Promise<Response> {
		const auth = AuthMiddleware.getAuthContext(ctx)
		if (!auth) return ctx.json({ success: false, message: '未經授權' }, 401)
		const orgId = ctx.getParam('id')
		if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
		const result = await this.listInvitationsService.execute(orgId, auth.userId, auth.role)
		return ctx.json(result, 200)
	}

	async cancelInvitation(ctx: IHttpContext): Promise<Response> {
		const auth = AuthMiddleware.getAuthContext(ctx)
		if (!auth) return ctx.json({ success: false, message: '未經授權' }, 401)
		const orgId = ctx.getParam('id')
		const invId = ctx.getParam('invId')
		if (!orgId || !invId) return ctx.json({ success: false, message: '缺少參數' }, 400)
		const result = await this.cancelInvitationService.execute(orgId, invId, auth.userId, auth.role)
		return ctx.json(result, result.success ? 200 : 400)
	}
}
