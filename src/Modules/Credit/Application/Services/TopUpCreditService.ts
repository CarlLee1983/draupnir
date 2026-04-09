// src/Modules/Credit/Application/Services/TopUpCreditService.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import { CreditAccount } from '../../Domain/Aggregates/CreditAccount'
import { CreditTransaction } from '../../Domain/Entities/CreditTransaction'
import { TransactionType } from '../../Domain/ValueObjects/TransactionType'
import { Balance } from '../../Domain/ValueObjects/Balance'
import type { TopUpRequest, CreditResponse } from '../DTOs/CreditDTO'

export class TopUpCreditService {
  constructor(
    private readonly accountRepo: ICreditAccountRepository,
    private readonly txRepo: ICreditTransactionRepository,
    private readonly db: IDatabaseAccess,
  ) {}

  async execute(request: TopUpRequest): Promise<CreditResponse> {
    try {
      const amount = Balance.fromString(request.amount)
      if (amount.isNegativeOrZero()) {
        return { success: false, message: '充值金額必須為正數', error: 'INVALID_AMOUNT' }
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
        description: request.description ?? `管理者 ${request.callerUserId} 充值`,
      })

      await this.db.transaction(async (tx) => {
        const txAccountRepo = this.accountRepo.withTransaction(tx)
        const txTxRepo = this.txRepo.withTransaction(tx)
        await txAccountRepo.update(updated)
        await txTxRepo.save(transaction)
      })

      return {
        success: true,
        message: '充值成功',
        data: {
          balance: updated.balance,
          transactionId: transaction.id,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '充值失敗'
      return { success: false, message, error: message }
    }
  }
}
