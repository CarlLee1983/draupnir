// src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import { AuthTokenRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthTokenRepository'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'

let jwtParser: AuthMiddleware | null = null

function getJwtParser(): AuthMiddleware {
	if (!jwtParser) {
		jwtParser = new AuthMiddleware(new AuthTokenRepository(getCurrentDatabaseAccess()))
	}
	return jwtParser
}

/** 僅解析 JWT 注入 ctx（不強制登入），供 logout 等端點使用 */
export function attachJwt(): Middleware {
	return async (ctx, next) => {
		await getJwtParser().handle(ctx)
		return next()
	}
}

export function requireAuth(): Middleware {
	return async (ctx, next) => {
		await getJwtParser().handle(ctx)
		if (!AuthMiddleware.isAuthenticated(ctx)) {
			return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
		}
		return next()
	}
}

export function createRoleMiddleware(...roles: string[]): Middleware {
	return async (ctx, next) => {
		await getJwtParser().handle(ctx)
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
