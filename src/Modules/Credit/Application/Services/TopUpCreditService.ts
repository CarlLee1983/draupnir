// src/Modules/Credit/Application/Services/TopUpCreditService.ts
/**
 * TopUpCreditService
 * Application service: handles increasing an organization's credit balance.
 *
 * Responsibilities:
 * - Validate top-up amount
 * - Create credit account if missing
 * - Calculate new balance and record transaction
 * - Dispatch domain events for downstream notification
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import { CreditAccount } from '../../Domain/Aggregates/CreditAccount'
import { CreditTransaction } from '../../Domain/Entities/CreditTransaction'
import { TransactionType } from '../../Domain/ValueObjects/TransactionType'
import { Balance } from '../../Domain/ValueObjects/Balance'
import { CreditToppedUp } from '../../Domain/Events/CreditToppedUp'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { TopUpRequest, CreditResponse } from '../DTOs/CreditDTO'

/**
 * Service for topping up an organization's credits.
 */
export class TopUpCreditService {
  constructor(
    private readonly accountRepo: ICreditAccountRepository,
    private readonly txRepo: ICreditTransactionRepository,
    private readonly db: IDatabaseAccess,
  ) {}

  /**
   * Executes the top-up operation.
   * @param request - Top-up payload including orgId and amount.
   */
  async execute(request: TopUpRequest): Promise<CreditResponse> {
    try {
      try {
        Balance.fromPositiveAmount(request.amount)
      } catch {
        return { success: false, message: 'Top-up amount must be positive', error: 'INVALID_AMOUNT' }
      }

      let account = await this.accountRepo.findByOrgId(request.orgId)
      if (!account) {
        account = CreditAccount.create(crypto.randomUUID(), request.orgId)
        await this.accountRepo.save(account)
      }

      const updated = account.applyTopUp(request.amount)
      const transaction = CreditTransaction.create({
        id: crypto.randomUUID(),
        creditAccountId: account.id,
        type: TransactionType.topup(),
        amount: request.amount,
        balanceAfter: updated.balance,
        description: request.description ?? `Top-up by Admin ${request.callerUserId}`,
      })

      await this.db.transaction(async (tx) => {
        const txAccountRepo = this.accountRepo.withTransaction(tx)
        const txTxRepo = this.txRepo.withTransaction(tx)
        await txAccountRepo.update(updated)
        await txTxRepo.save(transaction)
      })

      await DomainEventDispatcher.getInstance().dispatch(
        new CreditToppedUp(account.id, request.orgId, request.amount),
      )

      return {
        success: true,
        message: 'Top-up successful',
        data: {
          balance: updated.balance,
          transactionId: transaction.id,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Top-up failed'
      return { success: false, message, error: message }
    }
  }
}

