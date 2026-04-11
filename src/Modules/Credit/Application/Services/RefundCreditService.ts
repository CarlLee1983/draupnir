// src/Modules/Credit/Application/Services/RefundCreditService.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import { CreditTransaction } from '../../Domain/Entities/CreditTransaction'
import { TransactionType } from '../../Domain/ValueObjects/TransactionType'
import { Balance } from '../../Domain/ValueObjects/Balance'
import type { CreditResponse } from '../DTOs/CreditDTO'

export interface RefundRequest {
  orgId: string
  amount: string
  referenceType?: string
  referenceId?: string
  description?: string
  callerUserId: string
  callerSystemRole: string
}

export class RefundCreditService {
  constructor(
    private readonly accountRepo: ICreditAccountRepository,
    private readonly txRepo: ICreditTransactionRepository,
    private readonly db: IDatabaseAccess,
  ) {}

  async execute(request: RefundRequest): Promise<CreditResponse> {
    try {
      try {
        Balance.fromPositiveAmount(request.amount)
      } catch {
        return { success: false, message: 'Refund amount must be a positive number', error: 'INVALID_AMOUNT' }
      }

      const account = await this.accountRepo.findByOrgId(request.orgId)
      if (!account) {
        return { success: false, message: 'Account not found', error: 'ACCOUNT_NOT_FOUND' }
      }

      const updated = account.applyTopUp(request.amount)
      const transaction = CreditTransaction.create({
        id: crypto.randomUUID(),
        creditAccountId: account.id,
        type: TransactionType.refund(),
        amount: request.amount,
        balanceAfter: updated.balance,
        referenceType: request.referenceType,
        referenceId: request.referenceId,
        description: request.description ?? `Admin ${request.callerUserId} refund`,
      })

      await this.db.transaction(async (tx) => {
        const txAccountRepo = this.accountRepo.withTransaction(tx)
        const txTxRepo = this.txRepo.withTransaction(tx)
        await txAccountRepo.update(updated)
        await txTxRepo.save(transaction)
      })

      return {
        success: true,
        message: 'Refund processed successfully',
        data: {
          balance: updated.balance,
          transactionId: transaction.id,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Refund failed'
      return { success: false, message, error: message }
    }
  }
}
