// src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { CreditAccountRepository } from '../Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Repositories/CreditTransactionRepository'
import { CreditDeductionService } from '../../Domain/Services/CreditDeductionService'
import { TopUpCreditService } from '../../Application/Services/TopUpCreditService'
import { GetBalanceService } from '../../Application/Services/GetBalanceService'
import { GetTransactionHistoryService } from '../../Application/Services/GetTransactionHistoryService'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'

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
  }

  override boot(_context: unknown): void {
    console.log('💰 [Credit] Module loaded')
  }
}
