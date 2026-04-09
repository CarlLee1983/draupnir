// src/Modules/Credit/Domain/Services/CreditDeductionService.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ICreditAccountRepository } from '../Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../Repositories/ICreditTransactionRepository'
import { CreditTransaction } from '../Entities/CreditTransaction'
import { TransactionType } from '../ValueObjects/TransactionType'
import { BalanceLow } from '../Events/BalanceLow'
import { BalanceDepleted } from '../Events/BalanceDepleted'
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'

interface DeductParams {
  db: IDatabaseAccess
  accountRepo: ICreditAccountRepository
  transactionRepo: ICreditTransactionRepository
  orgId: string
  amount: string
  referenceType?: string
  referenceId?: string
  description?: string
}

interface DeductResult {
  success: boolean
  newBalance?: string
  events: DomainEvent[]
  error?: string
}

export class CreditDeductionService {
  async deduct(params: DeductParams): Promise<DeductResult> {
    const account = await params.accountRepo.findByOrgId(params.orgId)
    if (!account) {
      return { success: false, events: [], error: 'ACCOUNT_NOT_FOUND' }
    }

    const updated = account.applyDeduction(params.amount)

    const transaction = CreditTransaction.create({
      id: crypto.randomUUID(),
      creditAccountId: account.id,
      type: TransactionType.deduction(),
      amount: params.amount,
      balanceAfter: updated.balance,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      description: params.description,
    })

    await params.db.transaction(async (tx) => {
      const txAccountRepo = params.accountRepo.withTransaction(tx)
      const txTransactionRepo = params.transactionRepo.withTransaction(tx)
      await txAccountRepo.update(updated)
      await txTransactionRepo.save(transaction)
    })

    const events: DomainEvent[] = []

    if (updated.isBalanceDepleted()) {
      events.push(new BalanceDepleted(account.id, account.orgId))
    } else if (updated.isBalanceLow()) {
      events.push(new BalanceLow(account.id, account.orgId, updated.balance))
    }

    return { success: true, newBalance: updated.balance, events }
  }
}
