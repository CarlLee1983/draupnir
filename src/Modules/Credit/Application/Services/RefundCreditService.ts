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
      const amount = Balance.fromString(request.amount)
      if (amount.isNegativeOrZero()) {
        return { success: false, message: '退款金額必須為正數', error: 'INVALID_AMOUNT' }
      }

      const account = await this.accountRepo.findByOrgId(request.orgId)
      if (!account) {
        return { success: false, message: '帳戶不存在', error: 'ACCOUNT_NOT_FOUND' }
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
        description: request.description ?? `管理者 ${request.callerUserId} 退款`,
      })

      await this.db.transaction(async (tx) => {
        const txAccountRepo = this.accountRepo.withTransaction(tx)
        const txTxRepo = this.txRepo.withTransaction(tx)
        await txAccountRepo.update(updated)
        await txTxRepo.save(transaction)
      })

      return {
        success: true,
        message: '退款成功',
        data: {
          balance: updated.balance,
          transactionId: transaction.id,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '退款失敗'
      return { success: false, message, error: message }
    }
  }
}
