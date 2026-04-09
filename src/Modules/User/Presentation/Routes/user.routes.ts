import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { UserController } from '../Controllers/UserController'
import { requireAuth, createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { UpdateProfileRequest, ChangeStatusRequest, ListUsersRequest } from '../Requests'

export async function registerUserRoutes(router: IModuleRouter, controller: UserController): Promise<void> {
  router.get('/api/users/me',             [requireAuth()],                  (ctx) => controller.getMe(ctx))
  router.put('/api/users/me',             [requireAuth()], UpdateProfileRequest, (ctx) => controller.updateMe(ctx))
  router.get('/api/users',                [createRoleMiddleware('admin')], ListUsersRequest, (ctx) => controller.listUsers(ctx))
  router.get('/api/users/:id',            [createRoleMiddleware('admin')],   (ctx) => controller.getUser(ctx))
  router.patch('/api/users/:id/status',   [createRoleMiddleware('admin')], ChangeStatusRequest, (ctx) => controller.changeUserStatus(ctx))
}
