// src/Modules/User/Presentation/Controllers/UserController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { GetUserProfileService } from '../../Application/Services/GetUserProfileService'
import type { UpdateUserProfileService } from '../../Application/Services/UpdateUserProfileService'
import type { ListUsersService } from '../../Application/Services/ListUsersService'
import type { ChangeUserStatusService } from '../../Application/Services/ChangeUserStatusService'

export class UserController {
	constructor(
		private getUserProfileService: GetUserProfileService,
		private updateUserProfileService: UpdateUserProfileService,
		private listUsersService: ListUsersService,
		private changeUserStatusService: ChangeUserStatusService,
	) {}

	async getMe(ctx: IHttpContext): Promise<Response> {
		const auth = AuthMiddleware.getAuthContext(ctx)
		if (!auth) {
			return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
		}
		const result = await this.getUserProfileService.execute(auth.userId)
		return ctx.json(result, result.success ? 200 : 404)
	}

	async updateMe(ctx: IHttpContext): Promise<Response> {
		const auth = AuthMiddleware.getAuthContext(ctx)
		if (!auth) {
			return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
		}
		const body = await ctx.getJsonBody<Record<string, unknown>>()
		const result = await this.updateUserProfileService.execute(auth.userId, body)
		return ctx.json(result, result.success ? 200 : 400)
	}

	async listUsers(ctx: IHttpContext): Promise<Response> {
		const request = {
			role: ctx.getQuery('role'),
			status: ctx.getQuery('status'),
			keyword: ctx.getQuery('keyword'),
			page: ctx.getQuery('page') ? Number(ctx.getQuery('page')) : undefined,
			limit: ctx.getQuery('limit') ? Number(ctx.getQuery('limit')) : undefined,
		}
		const result = await this.listUsersService.execute(request)
		return ctx.json(result, result.success ? 200 : 400)
	}

	async getUser(ctx: IHttpContext): Promise<Response> {
		const userId = ctx.getParam('id')
		if (!userId) {
			return ctx.json({ success: false, message: '缺少使用者 ID', error: 'MISSING_ID' }, 400)
		}
		const result = await this.getUserProfileService.execute(userId)
		return ctx.json(result, result.success ? 200 : 404)
	}

	async changeUserStatus(ctx: IHttpContext): Promise<Response> {
		const userId = ctx.getParam('id')
		if (!userId) {
			return ctx.json({ success: false, message: '缺少使用者 ID', error: 'MISSING_ID' }, 400)
		}
		const body = await ctx.getJsonBody<{ status: 'active' | 'suspended' }>()
		const result = await this.changeUserStatusService.execute(userId, body)
		return ctx.json(result, result.success ? 200 : 400)
	}
}
