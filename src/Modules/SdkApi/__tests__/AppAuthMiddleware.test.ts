import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppAuthMiddleware } from '../Infrastructure/Middleware/AppAuthMiddleware'
import { AuthenticateApp } from '../Application/UseCases/AuthenticateApp'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { AppAuthContext } from '../Application/DTOs/SdkApiDTO'

function createMockCtx(authHeader?: string): IHttpContext {
	const store = new Map<string, unknown>()
	return {
		getHeader: (name: string) => {
			if (name.toLowerCase() === 'authorization') return authHeader
			return undefined
		},
		headers: { authorization: authHeader },
		json: vi.fn((data, statusCode) => new Response(JSON.stringify(data), { status: statusCode ?? 200 })),
		get: <T>(key: string) => store.get(key) as T | undefined,
		set: (key: string, value: unknown) => {
			store.set(key, value)
		},
		getBodyText: vi.fn(),
		getJsonBody: vi.fn(),
		getBody: vi.fn(),
		getParam: vi.fn(),
		getPathname: vi.fn(() => '/sdk/v1/chat/completions'),
		getQuery: vi.fn(),
		params: {},
		query: {},
		text: vi.fn(),
		redirect: vi.fn(),
	} as unknown as IHttpContext
}

describe('AppAuthMiddleware', () => {
	let middleware: AppAuthMiddleware
	let mockAuthenticateApp: AuthenticateApp

	const validContext: AppAuthContext = {
		appKeyId: 'appkey-1',
		orgId: 'org-1',
		bifrostVirtualKeyId: 'bfr-vk-1',
		scope: 'write',
		boundModuleIds: ['mod-1'],
	}

	beforeEach(() => {
		mockAuthenticateApp = {
			execute: vi.fn().mockResolvedValue({ success: true, context: validContext }),
		} as unknown as AuthenticateApp
		middleware = new AppAuthMiddleware(mockAuthenticateApp)
	})

	it('應以有效的 Bearer token 認證成功並注入 appAuth', async () => {
		const ctx = createMockCtx('Bearer drp_app_validkey123')
		const next = vi.fn().mockResolvedValue(new Response('OK'))

		await middleware.handle(ctx, next)

		expect(next).toHaveBeenCalled()
		expect(ctx.get<AppAuthContext>('appAuth')).toEqual(validContext)
	})

	it('缺少 Authorization header 應回傳 401', async () => {
		const ctx = createMockCtx()
		const next = vi.fn()

		const result = await middleware.handle(ctx, next)

		expect(next).not.toHaveBeenCalled()
		expect(result.status).toBe(401)
	})

	it('非 Bearer scheme 應回傳 401', async () => {
		const ctx = createMockCtx('Basic abc123')
		const next = vi.fn()

		const result = await middleware.handle(ctx, next)

		expect(next).not.toHaveBeenCalled()
		expect(result.status).toBe(401)
	})

	it('認證失敗應回傳 401', async () => {
		;(mockAuthenticateApp.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: false,
			error: 'INVALID_APP_KEY',
			message: 'App Key 無效',
		})
		const ctx = createMockCtx('Bearer drp_app_invalidkey')
		const next = vi.fn()

		const result = await middleware.handle(ctx, next)

		expect(next).not.toHaveBeenCalled()
		expect(result.status).toBe(401)
	})

	it('getAppAuthContext 應正確取得已注入的認證上下文', async () => {
		const ctx = createMockCtx('Bearer drp_app_validkey123')
		const next = vi.fn().mockResolvedValue(new Response('OK'))

		await middleware.handle(ctx, next)

		const auth = AppAuthMiddleware.getAppAuthContext(ctx)
		expect(auth).toEqual(validContext)
	})

	it('未認證時 getAppAuthContext 應回傳 null', () => {
		const ctx = createMockCtx()
		const auth = AppAuthMiddleware.getAppAuthContext(ctx)
		expect(auth).toBeNull()
	})
})
