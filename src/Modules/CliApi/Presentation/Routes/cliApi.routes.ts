// src/Modules/CliApi/Presentation/Routes/cliApi.routes.ts
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { CliApiController } from '../Controllers/CliApiController'
import { requireAuth } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export function registerCliApiRoutes(router: IModuleRouter, controller: CliApiController): void {
  // 公開端點（CLI 端使用，無需認證）
  router.post('/cli/device-code', [], (ctx) => controller.initiateDeviceFlow(ctx))
  router.post('/cli/token', [], (ctx) => controller.exchangeToken(ctx))

  // 需要認證的端點
  router.post('/cli/authorize', [requireAuth()], (ctx) => controller.authorizeDevice(ctx))
  router.post('/cli/proxy', [requireAuth()], (ctx) => controller.proxyRequest(ctx))
  router.post('/cli/logout', [requireAuth()], (ctx) => controller.logout(ctx))
  router.post('/cli/logout-all', [requireAuth()], (ctx) => controller.logoutAll(ctx))
}
