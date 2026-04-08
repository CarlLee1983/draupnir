// src/Modules/User/Presentation/Routes/user.routes.ts
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { UserController } from '../Controllers/UserController'
import { requireAuth, createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export async function registerUserRoutes(
	router: IModuleRouter,
	controller: UserController,
): Promise<void> {
	// 已認證使用者 — 自己的 Profile
	router.get('/api/users/me', [requireAuth()], (ctx) => controller.getMe(ctx))
	router.put('/api/users/me', [requireAuth()], (ctx) => controller.updateMe(ctx))

	// Admin 專用
	router.get('/api/users', [createRoleMiddleware('admin')], (ctx) => controller.listUsers(ctx))
	router.get('/api/users/:id', [createRoleMiddleware('admin')], (ctx) => controller.getUser(ctx))
	router.patch('/api/users/:id/status', [createRoleMiddleware('admin')], (ctx) => controller.changeUserStatus(ctx))
}
