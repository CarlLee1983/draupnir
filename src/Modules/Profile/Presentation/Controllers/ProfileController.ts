import type { ChangeUserStatusService } from '@/Modules/Auth/Application/Services/ChangeUserStatusService'
import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { GetProfileService } from '../../Application/Services/GetProfileService'
import type { UpdateProfileService } from '../../Application/Services/UpdateProfileService'
import type { ChangeStatusParams, ListUsersQueryParams, UpdateProfileParams } from '../Requests'
import { UserIdSchema } from '../Requests'

/**
 * Controller for Profile-related endpoints.
 * Orchestrates calls between HTTP requests and application services.
 */
export class ProfileController {
  constructor(
    private getProfileService: GetProfileService,
    private updateProfileService: UpdateProfileService,
    private listUsersService: ListUsersService,
    private changeUserStatusService: ChangeUserStatusService,
  ) {}

  /**
   * Retrieves the profile of the currently authenticated user.
   */
  async getMe(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }
    const result = await this.getProfileService.execute(auth.userId)
    return ctx.json(result, result.success ? 200 : 404)
  }

  /**
   * Updates the profile of the currently authenticated user.
   */
  async updateMe(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }
    const body = ctx.get('validated') as UpdateProfileParams
    const result = await this.updateProfileService.execute(auth.userId, body)
    return ctx.json(result, result.success ? 200 : 400)
  }

  /**
   * Lists users (admin operation).
   */
  async listUsers(ctx: IHttpContext): Promise<Response> {
    const query = ctx.get('validated') as ListUsersQueryParams
    const result = await this.listUsersService.execute(query)
    return ctx.json(result, result.success ? 200 : 400)
  }

  /**
   * Retrieves a specific user profile by ID.
   */
  async getUser(ctx: IHttpContext): Promise<Response> {
    const validation = UserIdSchema.safeParse({ id: ctx.getParam('id') })
    if (!validation.success) {
      return ctx.json(
        {
          success: false,
          message: 'Validation failed',
          error: validation.error.issues[0]?.message ?? 'Invalid user ID',
        },
        400,
      )
    }
    const result = await this.getProfileService.execute(validation.data.id)
    return ctx.json(result, result.success ? 200 : 404)
  }

  /**
   * Changes a user's status (admin operation).
   */
  async changeUserStatus(ctx: IHttpContext): Promise<Response> {
    const idValidation = UserIdSchema.safeParse({ id: ctx.getParam('id') })
    if (!idValidation.success) {
      return ctx.json(
        {
          success: false,
          message: 'Validation failed',
          error: idValidation.error.issues[0]?.message ?? 'Invalid user ID',
        },
        400,
      )
    }
    const body = ctx.get('validated') as ChangeStatusParams
    const result = await this.changeUserStatusService.execute(idValidation.data.id, body)
    return ctx.json(result, result.success ? 200 : 400)
  }
}
