// src/Modules/Contract/Infrastructure/Providers/ContractServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { ContractRepository } from '../Repositories/ContractRepository'
import { ContractEnforcementService } from '../../Domain/Services/ContractEnforcementService'
import { CreateContractService } from '../../Application/Services/CreateContractService'
import { ActivateContractService } from '../../Application/Services/ActivateContractService'
import { UpdateContractService } from '../../Application/Services/UpdateContractService'
import { AssignContractService } from '../../Application/Services/AssignContractService'
import { TerminateContractService } from '../../Application/Services/TerminateContractService'
import { RenewContractService } from '../../Application/Services/RenewContractService'
import { HandleContractExpiryService } from '../../Application/Services/HandleContractExpiryService'
import { ListContractsService } from '../../Application/Services/ListContractsService'
import { GetContractDetailService } from '../../Application/Services/GetContractDetailService'

export class ContractServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('contractRepository', () => new ContractRepository(db))
    container.singleton('contractEnforcementService', () => new ContractEnforcementService())

    container.bind('createContractService', (c: IContainer) => {
      return new CreateContractService(
        c.make('contractRepository') as ContractRepository,
      )
    })

    container.bind('activateContractService', (c: IContainer) => {
      return new ActivateContractService(
        c.make('contractRepository') as ContractRepository,
      )
    })

    container.bind('updateContractService', (c: IContainer) => {
      return new UpdateContractService(
        c.make('contractRepository') as ContractRepository,
      )
    })

    container.bind('assignContractService', (c: IContainer) => {
      return new AssignContractService(
        c.make('contractRepository') as ContractRepository,
      )
    })

    container.bind('terminateContractService', (c: IContainer) => {
      return new TerminateContractService(
        c.make('contractRepository') as ContractRepository,
      )
    })

    container.bind('renewContractService', (c: IContainer) => {
      return new RenewContractService(
        c.make('contractRepository') as ContractRepository,
      )
    })

    container.bind('handleContractExpiryService', (c: IContainer) => {
      return new HandleContractExpiryService(
        c.make('contractRepository') as ContractRepository,
      )
    })

    container.bind('listContractsService', (c: IContainer) => {
      return new ListContractsService(
        c.make('contractRepository') as ContractRepository,
      )
    })

    container.bind('getContractDetailService', (c: IContainer) => {
      return new GetContractDetailService(
        c.make('contractRepository') as ContractRepository,
      )
    })
  }

  override boot(): void {
    console.log('📋 [Contract] Module loaded')
  }
}
