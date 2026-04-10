// src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { CreditAccountRepository } from '../Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Repositories/CreditTransactionRepository'
import { CreditDeductionService } from '../../Domain/Services/CreditDeductionService'
import { TopUpCreditService } from '../../Application/Services/TopUpCreditService'
import { GetBalanceService } from '../../Application/Services/GetBalanceService'
import { GetTransactionHistoryService } from '../../Application/Services/GetTransactionHistoryService'
import { RefundCreditService } from '../../Application/Services/RefundCreditService'
import { HandleBalanceDepletedService } from '../../Application/Services/HandleBalanceDepletedService'
import { HandleCreditToppedUpService } from '../../Application/Services/HandleCreditToppedUpService'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'

export class CreditServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('creditAccountRepository', () => new CreditAccountRepository(db))
    container.singleton('creditTransactionRepository', () => new CreditTransactionRepository(db))
    container.singleton('creditDeductionService', () => new CreditDeductionService())

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
