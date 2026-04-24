import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { SystemClock } from '@/Shared/Infrastructure/Services/SystemClock'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { ApplyUsageChargesService } from '../../Application/Services/ApplyUsageChargesService'
import { DeductCreditService } from '../../Application/Services/DeductCreditService'
import { GetBalanceService } from '../../Application/Services/GetBalanceService'
import { GetTransactionHistoryService } from '../../Application/Services/GetTransactionHistoryService'
import { HandleBalanceDepletedService } from '../../Application/Services/HandleBalanceDepletedService'
import { HandleCreditToppedUpService } from '../../Application/Services/HandleCreditToppedUpService'
import { RefundCreditService } from '../../Application/Services/RefundCreditService'
import { TopUpCreditService } from '../../Application/Services/TopUpCreditService'
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import { CreditController } from '../../Presentation/Controllers/CreditController'
import { registerCreditRoutes } from '../../Presentation/Routes/credit.routes'
import { CreditAccountRepository } from '../Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Repositories/CreditTransactionRepository'

export class CreditServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.singleton('creditAccountRepository', () => new CreditAccountRepository(db))
    container.singleton('creditTransactionRepository', () => new CreditTransactionRepository(db))
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('clock', () => new SystemClock())
  }

  protected override registerApplicationServices(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.bind(
      'deductCreditService',
      (c: IContainer) =>
        new DeductCreditService(
          c.make('creditAccountRepository') as ICreditAccountRepository,
          c.make('creditTransactionRepository') as ICreditTransactionRepository,
          db,
        ),
    )
    container.bind(
      'applyUsageChargesService',
      (c: IContainer) =>
        new ApplyUsageChargesService(
          c.make('creditAccountRepository') as ICreditAccountRepository,
          c.make('creditTransactionRepository') as ICreditTransactionRepository,
          c.make('deductCreditService') as DeductCreditService,
          db,
        ),
    )
    container.bind(
      'topUpCreditService',
      (c: IContainer) =>
        new TopUpCreditService(
          c.make('creditAccountRepository') as CreditAccountRepository,
          c.make('creditTransactionRepository') as CreditTransactionRepository,
          db,
        ),
    )
    container.bind(
      'getBalanceService',
      (c: IContainer) =>
        new GetBalanceService(
          c.make('creditAccountRepository') as CreditAccountRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        ),
    )
    container.bind(
      'getTransactionHistoryService',
      (c: IContainer) =>
        new GetTransactionHistoryService(
          c.make('creditAccountRepository') as CreditAccountRepository,
          c.make('creditTransactionRepository') as CreditTransactionRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        ),
    )
    container.bind(
      'refundCreditService',
      (c: IContainer) =>
        new RefundCreditService(
          c.make('creditAccountRepository') as CreditAccountRepository,
          c.make('creditTransactionRepository') as CreditTransactionRepository,
          db,
        ),
    )
    container.bind(
      'handleBalanceDepletedService',
      (c: IContainer) =>
        new HandleBalanceDepletedService(
          c.make('apiKeyRepository') as IApiKeyRepository,
          c.make('llmGatewayClient') as ILLMGatewayClient,
        ),
    )
    container.bind(
      'handleCreditToppedUpService',
      (c: IContainer) =>
        new HandleCreditToppedUpService(
          c.make('apiKeyRepository') as IApiKeyRepository,
          c.make('llmGatewayClient') as ILLMGatewayClient,
        ),
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind(
      'creditController',
      (c: IContainer) =>
        new CreditController(
          c.make('topUpCreditService') as TopUpCreditService,
          c.make('getBalanceService') as GetBalanceService,
          c.make('getTransactionHistoryService') as GetTransactionHistoryService,
          c.make('refundCreditService') as RefundCreditService,
        ),
    )
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('creditController') as CreditController
    registerCreditRoutes(context.router, controller)
  }

  override boot(container: IContainer): void {
    const dispatcher = DomainEventDispatcher.getInstance()
    dispatcher.on('bifrost.sync.completed', async (event) => {
      const handler = container.make('applyUsageChargesService') as ApplyUsageChargesService
      const orgIds = Array.isArray(event.data.orgIds)
        ? event.data.orgIds.map((value) => String(value))
        : []
      await handler.execute({
        orgIds,
        startTime:
          typeof event.data.startTime === 'string' ? (event.data.startTime as string) : undefined,
        endTime:
          typeof event.data.endTime === 'string' ? (event.data.endTime as string) : undefined,
      })
    })
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
