// src/Modules/Contract/index.ts
/**
 * Public surface of the Contract bounded context (routes, controller, DI provider).
 */

export { ContractServiceProvider } from './Infrastructure/Providers/ContractServiceProvider'
export { ContractController } from './Presentation/Controllers/ContractController'
export { registerContractRoutes } from './Presentation/Routes/contract.routes'
