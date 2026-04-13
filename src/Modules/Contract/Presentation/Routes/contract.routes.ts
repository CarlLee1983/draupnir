// src/Modules/Contract/Presentation/Routes/contract.routes.ts

import { createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { ContractController } from '../Controllers/ContractController'
import {
  AssignContractRequest,
  CreateContractRequest,
  ListContractsRequest,
  RenewContractRequest,
  UpdateContractRequest,
} from '../Requests'

/** Registers contract REST endpoints and wires them to {@link ContractController} handlers. */
export function registerContractRoutes(
  router: IModuleRouter,
  controller: ContractController,
): void {
  const adminAuth = [createRoleMiddleware('admin')]

  router.post('/api/contracts/handle-expiry', adminAuth, (ctx) => controller.handleExpiry(ctx))

  router.post('/api/contracts', adminAuth, CreateContractRequest, (ctx) => controller.create(ctx))
  router.get('/api/contracts', adminAuth, ListContractsRequest, (ctx) => controller.list(ctx))
  router.get('/api/contracts/:contractId', adminAuth, (ctx) => controller.getDetail(ctx))
  router.put('/api/contracts/:contractId', adminAuth, UpdateContractRequest, (ctx) =>
    controller.update(ctx),
  )
  router.post('/api/contracts/:contractId/activate', adminAuth, (ctx) => controller.activate(ctx))
  router.post('/api/contracts/:contractId/terminate', adminAuth, (ctx) => controller.terminate(ctx))
  router.post('/api/contracts/:contractId/renew', adminAuth, RenewContractRequest, (ctx) =>
    controller.renew(ctx),
  )
  router.post('/api/contracts/:contractId/assign', adminAuth, AssignContractRequest, (ctx) =>
    controller.assign(ctx),
  )
}
