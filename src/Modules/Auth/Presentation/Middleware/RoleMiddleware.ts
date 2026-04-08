// src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export function requireAuth(): Middleware {
	return async (ctx, next) => {
		if (!AuthMiddleware.isAuthenticated(ctx)) {
			return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
		}
		return next()
	}
}

export function createRoleMiddleware(...roles: string[]): Middleware {
	return async (ctx, next) => {
		const auth = AuthMiddleware.getAuthContext(ctx)
		if (!auth) {
			return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
		}
		if (!roles.includes(auth.role)) {
			return ctx.json({ success: false, message: '權限不足', error: 'FORBIDDEN' }, 403)
		}
		return next()
	}
}
