// src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts

import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { CreditController } from '../../Presentation/Controllers/CreditController'
import { registerCreditRoutes } from '../../Presentation/Routes/credit.routes'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
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

export class CreditServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('creditAccountRepository', () => new CreditAccountRepository(db))
    container.singleton('creditTransactionRepository', () => new CreditTransactionRepository(db))
    container.bind('deductCreditService', (c: IContainer) => {
      return new DeductCreditService(
        c.make('creditAccountRepository') as ICreditAccountRepository,
        c.make('creditTransactionRepository') as ICreditTransactionRepository,
        db,
      )
    })

    container.bind('topUpCreditService', (c: IContainer) => {
      return new TopUpCreditService(
        c.make('creditAccountRepository') as CreditAccountRepository,
        c.make('creditTransactionRepository') as CreditTransactionRepository,
        db,
      )
    })

    container.bind('getBalanceService', (c: IContainer) => {
      return new GetBalanceService(
        c.make('creditAccountRepository') as CreditAccountRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('getTransactionHistoryService', (c: IContainer) => {
      return new GetTransactionHistoryService(
        c.make('creditAccountRepository') as CreditAccountRepository,
        c.make('creditTransactionRepository') as CreditTransactionRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('refundCreditService', (c: IContainer) => {
      return new RefundCreditService(
        c.make('creditAccountRepository') as CreditAccountRepository,
        c.make('creditTransactionRepository') as CreditTransactionRepository,
        db,
      )
    })

    container.bind('handleBalanceDepletedService', (c: IContainer) => {
      return new HandleBalanceDepletedService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('llmGatewayClient') as ILLMGatewayClient,
      )
    })

    container.bind('handleCreditToppedUpService', (c: IContainer) => {
      return new HandleCreditToppedUpService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('llmGatewayClient') as ILLMGatewayClient,
      )
    })
  }

  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new CreditController(
      core.container.make('topUpCreditService') as any,
      core.container.make('getBalanceService') as any,
      core.container.make('getTransactionHistoryService') as any,
      core.container.make('refundCreditService') as any,
    )
    registerCreditRoutes(router, controller)
  }

  override boot(core: any): void {
    const container = core?.container ?? core
    const dispatcher = DomainEventDispatcher.getInstance()

    dispatcher.on('credit.balance_depleted', async (event) => {
      const handler = container.make('handleBalanceDepletedService') as HandleBalanceDepletedService
      const orgId = event.data.orgId as string
      await handler.execute(orgId)
    })

    dispatcher.on('credit.topped_up', async (event) => {
      const handler = container.make('handleCreditToppedUpService') as HandleCreditToppedUpService
      const orgId = event.data.orgId as string
      await handler.execute(orgId)
    })

    console.log('💰 [Credit] Module loaded')
  }
}
