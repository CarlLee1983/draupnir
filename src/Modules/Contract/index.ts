/**
 * Contract module public surface.
 *
 * Manages formal agreements, resource quotas, and access control policies 
 * for organizations and individual users.
 */

// Application Services
export { CreateContractService } from './Application/Services/CreateContractService'
export { ActivateContractService } from './Application/Services/ActivateContractService'
export { AdjustContractQuotaService } from './Application/Services/AdjustContractQuotaService'

// Domain
export { Contract } from './Domain/Aggregates/Contract'
export type { IContractRepository } from './Domain/Repositories/IContractRepository'
export { ContractStatus } from './Domain/ValueObjects/ContractStatus'

// Infrastructure
export { ContractServiceProvider } from './Infrastructure/Providers/ContractServiceProvider'

// Presentation
export { ContractController } from './Presentation/Controllers/ContractController'
export { registerContractRoutes } from './Presentation/Routes/contract.routes'
