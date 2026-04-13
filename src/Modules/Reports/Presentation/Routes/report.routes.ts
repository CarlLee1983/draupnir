import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { ReportController } from '../Controllers/ReportController'

export const registerReportRoutes = (router: IModuleRouter, controller: ReportController): void => {
  router.get('/v1/org/:orgId/reports', (ctx: IHttpContext) => controller.index(ctx))
  router.post('/v1/org/:orgId/reports', (ctx: IHttpContext) => controller.store(ctx))
  router.put('/v1/reports/:id', (ctx: IHttpContext) => controller.update(ctx))
  router.delete('/v1/reports/:id', (ctx: IHttpContext) => controller.destroy(ctx))

  // Public-ish route for template generation, protected by token
  router.get('/v1/reports/verify-template', (ctx: IHttpContext) => controller.verifyTemplate(ctx))
}
