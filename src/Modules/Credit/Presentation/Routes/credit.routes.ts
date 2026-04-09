// src/Modules/Credit/Presentation/Routes/credit.routes.ts
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { CreditController } from '../Controllers/CreditController'
import { requireAuth, createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { TopUpRequest, RefundRequest } from '../Requests'

export function registerCreditRoutes(router: IModuleRouter, controller: CreditController): void {
  router.get ('/api/organizations/:orgId/credits/balance',      [requireAuth()],                                 (ctx) => controller.getBalance(ctx))
  router.get ('/api/organizations/:orgId/credits/transactions', [requireAuth()],                                 (ctx) => controller.getTransactions(ctx))
  router.post('/api/organizations/:orgId/credits/topup',        [requireAuth(), createRoleMiddleware('admin')], TopUpRequest,  (ctx) => controller.topUp(ctx))
  router.post('/api/organizations/:orgId/credits/refund',       [requireAuth(), createRoleMiddleware('admin')], RefundRequest, (ctx) => controller.refund(ctx))
}
