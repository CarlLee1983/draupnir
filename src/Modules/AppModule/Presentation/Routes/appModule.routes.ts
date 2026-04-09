// src/Modules/AppModule/Presentation/Routes/appModule.routes.ts
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { AppModuleController } from '../Controllers/AppModuleController'
import { createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { RegisterModuleRequest, SubscribeModuleRequest } from '../Requests'

export function registerAppModuleRoutes(router: IModuleRouter, controller: AppModuleController): void {
  router.post('/api/modules', [createRoleMiddleware('admin')], RegisterModuleRequest, (ctx) => controller.register(ctx))
  router.get ('/api/modules', (ctx) => controller.listModules(ctx))
  router.get ('/api/modules/:moduleId', (ctx) => controller.getDetail(ctx))

  router.post  ('/api/organizations/:orgId/modules/subscribe', [createRoleMiddleware('admin')], SubscribeModuleRequest, (ctx) => controller.subscribe(ctx))
  router.delete('/api/organizations/:orgId/modules/:moduleId', [createRoleMiddleware('admin')], (ctx) => controller.unsubscribe(ctx))
  router.get   ('/api/organizations/:orgId/modules', (ctx) => controller.listOrgSubscriptions(ctx))
}
