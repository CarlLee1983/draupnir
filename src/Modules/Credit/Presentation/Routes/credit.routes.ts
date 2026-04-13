// src/Modules/Credit/Presentation/Routes/credit.routes.ts

import {
  createRoleMiddleware,
  requireAuth,
} from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { createModuleAccessMiddleware } from '@/Shared/Infrastructure/Middleware/ModuleAccessMiddleware'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { CreditController } from '../Controllers/CreditController'
import { RefundRequest, TopUpRequest } from '../Requests'

export function registerCreditRoutes(router: IModuleRouter, controller: CreditController): void {
  const creditAccess = [requireAuth(), createModuleAccessMiddleware('credit')]
  router.get('/api/organizations/:orgId/credits/balance', creditAccess, (ctx) =>
    controller.getBalance(ctx),
  )
  router.get('/api/organizations/:orgId/credits/transactions', creditAccess, (ctx) =>
    controller.getTransactions(ctx),
  )
  router.post(
    '/api/organizations/:orgId/credits/topup',
    [...creditAccess, createRoleMiddleware('admin')],
    TopUpRequest,
    (ctx) => controller.topUp(ctx),
  )
  router.post(
    '/api/organizations/:orgId/credits/refund',
    [...creditAccess, createRoleMiddleware('admin')],
    RefundRequest,
    (ctx) => controller.refund(ctx),
  )
}
