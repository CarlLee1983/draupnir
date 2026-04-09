// src/Modules/User/Presentation/Controllers/UserController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { GetUserProfileService } from '../../Application/Services/GetUserProfileService'
import type { UpdateUserProfileService } from '../../Application/Services/UpdateUserProfileService'
import type { ListUsersService } from '../../Application/Services/ListUsersService'
import type { ChangeUserStatusService } from '../../Application/Services/ChangeUserStatusService'
import type { UpdateProfileParams, ListUsersQueryParams, ChangeStatusParams } from '../Requests'
import { UserIdSchema } from '../Requests'

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
		const body = ctx.get('validated') as UpdateProfileParams
		const result = await this.updateUserProfileService.execute(auth.userId, body)
		return ctx.json(result, result.success ? 200 : 400)
	}

	async listUsers(ctx: IHttpContext): Promise<Response> {
		const query = ctx.get('validated') as ListUsersQueryParams
		const result = await this.listUsersService.execute(query)
		return ctx.json(result, result.success ? 200 : 400)
	}

	async getUser(ctx: IHttpContext): Promise<Response> {
		const validation = UserIdSchema.safeParse({ id: ctx.getParam('id') })
		if (!validation.success) {
			return ctx.json(
				{
					success: false,
					message: '驗證失敗',
					error: validation.error.issues[0]?.message ?? '無效的使用者 ID',
				},
				400,
			)
		}
		const result = await this.getUserProfileService.execute(validation.data.id)
		return ctx.json(result, result.success ? 200 : 404)
	}

	async changeUserStatus(ctx: IHttpContext): Promise<Response> {
		const idValidation = UserIdSchema.safeParse({ id: ctx.getParam('id') })
		if (!idValidation.success) {
			return ctx.json(
				{
					success: false,
					message: '驗證失敗',
					error: idValidation.error.issues[0]?.message ?? '無效的使用者 ID',
				},
				400,
			)
		}
		const body = ctx.get('validated') as ChangeStatusParams
		const result = await this.changeUserStatusService.execute(idValidation.data.id, body)
		return ctx.json(result, result.success ? 200 : 400)
	}
}
