import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { ActivateContractService } from '../../Application/Services/ActivateContractService'
import { AdjustContractQuotaService } from '../../Application/Services/AdjustContractQuotaService'
import { AssignContractService } from '../../Application/Services/AssignContractService'
import { CreateContractService } from '../../Application/Services/CreateContractService'
import { GetActiveOrgContractQuotaService } from '../../Application/Services/GetActiveOrgContractQuotaService'
import { GetContractDetailService } from '../../Application/Services/GetContractDetailService'
import { HandleContractExpiryService } from '../../Application/Services/HandleContractExpiryService'
import { ListAdminContractsService } from '../../Application/Services/ListAdminContractsService'
import { ListContractsService } from '../../Application/Services/ListContractsService'
import { RenewContractService } from '../../Application/Services/RenewContractService'
import { TerminateContractService } from '../../Application/Services/TerminateContractService'
import { UpdateContractService } from '../../Application/Services/UpdateContractService'
import { ContractEnforcementService } from '../../Domain/Services/ContractEnforcementService'
import { ContractRepository } from '../Repositories/ContractRepository'
import { ApiKeyRepository } from '@/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository'
import { ContractController } from '../../Presentation/Controllers/ContractController'
import { registerContractRoutes } from '../../Presentation/Routes/contract.routes'

export class ContractServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    container.singleton('contractRepository', () => new ContractRepository(getCurrentDatabaseAccess()))
  }

  protected override registerApplicationServices(container: IContainer): void {
    // ContractEnforcementService は Domain Service — app layer に登記
    container.singleton('contractEnforcementService', () => new ContractEnforcementService())
    container.bind('createContractService', (c: IContainer) =>
      new CreateContractService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('activateContractService', (c: IContainer) =>
      new ActivateContractService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('updateContractService', (c: IContainer) =>
      new UpdateContractService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('assignContractService', (c: IContainer) =>
      new AssignContractService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('terminateContractService', (c: IContainer) =>
      new TerminateContractService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('renewContractService', (c: IContainer) =>
      new RenewContractService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('handleContractExpiryService', (c: IContainer) =>
      new HandleContractExpiryService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('listContractsService', (c: IContainer) => new ListContractsService(
      c.make('contractRepository') as ContractRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('getContractDetailService', (c: IContainer) =>
      new GetContractDetailService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('getActiveOrgContractQuotaService', (c: IContainer) =>
      new GetActiveOrgContractQuotaService(
        c.make('contractRepository') as ContractRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      ),
    )
    container.bind('listAdminContractsService', (c: IContainer) =>
      new ListAdminContractsService(c.make('contractRepository') as ContractRepository)
    )
    container.singleton(
      'adjustContractQuotaService',
      (c) =>
        new AdjustContractQuotaService(
          c.make('contractRepository') as ContractRepository,
          c.make('apiKeyRepository') as ApiKeyRepository,
        ),
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('contractController', (c: IContainer) => new ContractController(
      c.make('createContractService') as CreateContractService,
      c.make('activateContractService') as ActivateContractService,
      c.make('updateContractService') as UpdateContractService,
      c.make('assignContractService') as AssignContractService,
      c.make('terminateContractService') as TerminateContractService,
      c.make('renewContractService') as RenewContractService,
      c.make('listContractsService') as ListContractsService,
      c.make('getContractDetailService') as GetContractDetailService,
      c.make('handleContractExpiryService') as HandleContractExpiryService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('contractController') as ContractController
    registerContractRoutes(context.router, controller)
  }

  override boot(_container: IContainer): void {
    console.log('📋 [Contract] Module loaded')
  }
}
