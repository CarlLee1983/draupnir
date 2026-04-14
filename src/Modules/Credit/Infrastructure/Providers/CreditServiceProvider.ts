import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { DeductCreditService } from '../../Application/Services/DeductCreditService'
import { GetBalanceService } from '../../Application/Services/GetBalanceService'
import { GetTransactionHistoryService } from '../../Application/Services/GetTransactionHistoryService'
import { HandleBalanceDepletedService } from '../../Application/Services/HandleBalanceDepletedService'
import { HandleCreditToppedUpService } from '../../Application/Services/HandleCreditToppedUpService'
import { RefundCreditService } from '../../Application/Services/RefundCreditService'
import { TopUpCreditService } from '../../Application/Services/TopUpCreditService'
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import { CreditAccountRepository } from '../Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Repositories/CreditTransactionRepository'
import { CreditController } from '../../Presentation/Controllers/CreditController'
import { registerCreditRoutes } from '../../Presentation/Routes/credit.routes'

export class CreditServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.singleton('creditAccountRepository', () => new CreditAccountRepository(db))
    container.singleton('creditTransactionRepository', () => new CreditTransactionRepository(db))
  }

  protected override registerApplicationServices(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.bind('deductCreditService', (c: IContainer) => new DeductCreditService(
      c.make('creditAccountRepository') as ICreditAccountRepository,
      c.make('creditTransactionRepository') as ICreditTransactionRepository,
      db,
    ))
    container.bind('topUpCreditService', (c: IContainer) => new TopUpCreditService(
      c.make('creditAccountRepository') as CreditAccountRepository,
      c.make('creditTransactionRepository') as CreditTransactionRepository,
      db,
    ))
    container.bind('getBalanceService', (c: IContainer) => new GetBalanceService(
      c.make('creditAccountRepository') as CreditAccountRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('getTransactionHistoryService', (c: IContainer) => new GetTransactionHistoryService(
      c.make('creditAccountRepository') as CreditAccountRepository,
      c.make('creditTransactionRepository') as CreditTransactionRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('refundCreditService', (c: IContainer) => new RefundCreditService(
      c.make('creditAccountRepository') as CreditAccountRepository,
      c.make('creditTransactionRepository') as CreditTransactionRepository,
      db,
    ))
    container.bind('handleBalanceDepletedService', (c: IContainer) => new HandleBalanceDepletedService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('llmGatewayClient') as ILLMGatewayClient,
    ))
    container.bind('handleCreditToppedUpService', (c: IContainer) => new HandleCreditToppedUpService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('llmGatewayClient') as ILLMGatewayClient,
    ))
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('creditController', (c: IContainer) => new CreditController(
      c.make('topUpCreditService') as TopUpCreditService,
      c.make('getBalanceService') as GetBalanceService,
      c.make('getTransactionHistoryService') as GetTransactionHistoryService,
      c.make('refundCreditService') as RefundCreditService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('creditController') as CreditController
    registerCreditRoutes(context.router, controller)
  }

  override boot(container: IContainer): void {
    const dispatcher = DomainEventDispatcher.getInstance()
    dispatcher.on('credit.balance_depleted', async (event) => {
      const handler = container.make('handleBalanceDepletedService') as HandleBalanceDepletedService
      await handler.execute(event.data.orgId as string)
    })
    dispatcher.on('credit.topped_up', async (event) => {
      const handler = container.make('handleCreditToppedUpService') as HandleCreditToppedUpService
      await handler.execute(event.data.orgId as string)
    })
    console.log('💰 [Credit] Module loaded')
  }
}
