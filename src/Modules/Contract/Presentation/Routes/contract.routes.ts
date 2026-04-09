// src/Modules/Contract/Presentation/Routes/contract.routes.ts
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { ContractController } from '../Controllers/ContractController'
import { createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import {
  CreateContractRequest,
  UpdateContractRequest,
  RenewContractRequest,
  AssignContractRequest,
  ListContractsRequest,
} from '../Requests'

export function registerContractRoutes(router: IModuleRouter, controller: ContractController): void {
  router.group('/api/contracts', (r) => {
    r.post('/',        [createRoleMiddleware('admin')], CreateContractRequest, (ctx) => controller.create(ctx))
    r.get ('/',        [createRoleMiddleware('admin')], ListContractsRequest,   (ctx) => controller.list(ctx))
    r.get ('/:contractId', [createRoleMiddleware('admin')], (ctx) => controller.getDetail(ctx))
    r.put ('/:contractId', [createRoleMiddleware('admin')], UpdateContractRequest, (ctx) => controller.update(ctx))
    r.post('/:contractId/activate', [createRoleMiddleware('admin')], (ctx) => controller.activate(ctx))
    r.post('/:contractId/terminate', [createRoleMiddleware('admin')], (ctx) => controller.terminate(ctx))
    r.post('/:contractId/renew', [createRoleMiddleware('admin')], RenewContractRequest, (ctx) => controller.renew(ctx))
    r.post('/:contractId/assign', [createRoleMiddleware('admin')], AssignContractRequest, (ctx) => controller.assign(ctx))
  })
}
