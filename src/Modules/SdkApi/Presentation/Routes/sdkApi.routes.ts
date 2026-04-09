import type { IModuleRouter, Middleware } from '@/Shared/Presentation/IModuleRouter'
import type { SdkApiController } from '../Controllers/SdkApiController'
import type { AppAuthMiddleware } from '../../Infrastructure/Middleware/AppAuthMiddleware'

export function createAppAuthMiddlewareHandler(appAuthMiddleware: AppAuthMiddleware): Middleware {
	return (ctx, next) => appAuthMiddleware.handle(ctx, next)
}

export function registerSdkApiRoutes(
	router: IModuleRouter,
	controller: SdkApiController,
	appAuthMiddleware: AppAuthMiddleware,
): void {
	const auth = [createAppAuthMiddlewareHandler(appAuthMiddleware)]

	router.post('/sdk/v1/chat/completions', auth, (ctx) => controller.chatCompletions(ctx))

	router.get('/sdk/v1/usage', auth, (ctx) => controller.getUsage(ctx))

	router.get('/sdk/v1/balance', auth, (ctx) => controller.getBalance(ctx))
}
