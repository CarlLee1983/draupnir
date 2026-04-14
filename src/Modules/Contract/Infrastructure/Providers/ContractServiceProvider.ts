// src/Modules/Contract/Infrastructure/Providers/ContractServiceProvider.ts

import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { ContractController } from '../../Presentation/Controllers/ContractController'
import { registerContractRoutes } from '../../Presentation/Routes/contract.routes'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { ActivateContractService } from '../../Application/Services/ActivateContractService'
import { AssignContractService } from '../../Application/Services/AssignContractService'
import { CreateContractService } from '../../Application/Services/CreateContractService'
import { GetContractDetailService } from '../../Application/Services/GetContractDetailService'
import { HandleContractExpiryService } from '../../Application/Services/HandleContractExpiryService'
import { ListAdminContractsService } from '../../Application/Services/ListAdminContractsService'
import { ListContractsService } from '../../Application/Services/ListContractsService'
import { RenewContractService } from '../../Application/Services/RenewContractService'
import { TerminateContractService } from '../../Application/Services/TerminateContractService'
import { UpdateContractService } from '../../Application/Services/UpdateContractService'
import { ContractEnforcementService } from '../../Domain/Services/ContractEnforcementService'
import { ContractRepository } from '../Repositories/ContractRepository'

/** Registers contract repositories, domain helpers, and application services in the DI container. */
export class ContractServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  /** Wires contract module singletons and scoped services. */
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('contractRepository', () => new ContractRepository(db))
    container.singleton('contractEnforcementService', () => new ContractEnforcementService())

    container.bind('createContractService', (c: IContainer) => {
      return new CreateContractService(c.make('contractRepository') as ContractRepository)
    })

    container.bind('activateContractService', (c: IContainer) => {
      return new ActivateContractService(c.make('contractRepository') as ContractRepository)
    })

    container.bind('updateContractService', (c: IContainer) => {
      return new UpdateContractService(c.make('contractRepository') as ContractRepository)
    })

    container.bind('assignContractService', (c: IContainer) => {
      return new AssignContractService(c.make('contractRepository') as ContractRepository)
    })

    container.bind('terminateContractService', (c: IContainer) => {
      return new TerminateContractService(c.make('contractRepository') as ContractRepository)
    })

    container.bind('renewContractService', (c: IContainer) => {
      return new RenewContractService(c.make('contractRepository') as ContractRepository)
    })

    container.bind('handleContractExpiryService', (c: IContainer) => {
      return new HandleContractExpiryService(c.make('contractRepository') as ContractRepository)
    })

    container.bind('listContractsService', (c: IContainer) => {
      return new ListContractsService(
        c.make('contractRepository') as ContractRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('getContractDetailService', (c: IContainer) => {
      return new GetContractDetailService(c.make('contractRepository') as ContractRepository)
    })

    container.bind('listAdminContractsService', (c: IContainer) => {
      return new ListAdminContractsService(c.make('contractRepository') as ContractRepository)
    })
  }

  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new ContractController(
      core.container.make('createContractService') as any,
      core.container.make('activateContractService') as any,
      core.container.make('updateContractService') as any,
      core.container.make('assignContractService') as any,
      core.container.make('terminateContractService') as any,
      core.container.make('renewContractService') as any,
      core.container.make('listContractsService') as any,
      core.container.make('getContractDetailService') as any,
      core.container.make('handleContractExpiryService') as any,
    )
    registerContractRoutes(router, controller)
  }

  /** Logs module load during application bootstrap. */
  override boot(): void {
    console.log('📋 [Contract] Module loaded')
  }
}
