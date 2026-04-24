import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { CreditTransaction } from '../../Domain/Entities/CreditTransaction'
import { BalanceDepleted } from '../../Domain/Events/BalanceDepleted'
import { BalanceLow } from '../../Domain/Events/BalanceLow'
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import { TransactionType } from '../../Domain/ValueObjects/TransactionType'

export interface DeductCreditRequest {
  orgId: string
  amount: string
  referenceType?: string
  referenceId?: string
  description?: string
}

export interface DeductCreditResponse {
  success: boolean
  newBalance?: string
  error?: string
}

export class DeductCreditService {
  constructor(
    private readonly accountRepo: ICreditAccountRepository,
    private readonly txRepo: ICreditTransactionRepository,
    private readonly db: IDatabaseAccess,
  ) {}

  async execute(request: DeductCreditRequest): Promise<DeductCreditResponse> {
    const account = await this.accountRepo.findByOrgId(request.orgId)
    if (!account) {
      return { success: false, error: 'ACCOUNT_NOT_FOUND' }
    }

    const updated = account.applyDeduction(request.amount)

    const transaction = CreditTransaction.create({
      id: crypto.randomUUID(),
      creditAccountId: account.id,
      type: TransactionType.deduction(),
      amount: request.amount,
      balanceAfter: updated.balance,
      referenceType: request.referenceType,
      referenceId: request.referenceId,
      description: request.description,
    })

    try {
      await this.db.transaction(async (tx) => {
        const txAccountRepo = this.accountRepo.withTransaction(tx)
        const txTransactionRepo = this.txRepo.withTransaction(tx)
        await txAccountRepo.update(updated)
        await txTransactionRepo.save(transaction)
      })
    } catch (error: unknown) {
      if (isUsageDeductionDuplicateError(error, request)) {
        const latestAccount = await this.accountRepo.findByOrgId(request.orgId)
        return { success: true, newBalance: latestAccount?.balance ?? account.balance }
      }
      throw error
    }

    if (updated.isBalanceDepleted()) {
      await DomainEventDispatcher.getInstance().dispatch(
        new BalanceDepleted(account.id, account.orgId),
      )
    } else if (updated.isBalanceLow()) {
      await DomainEventDispatcher.getInstance().dispatch(
        new BalanceLow(account.id, account.orgId, updated.balance),
      )
    }

    return { success: true, newBalance: updated.balance }
  }
}

function isUsageDeductionDuplicateError(error: unknown, request: DeductCreditRequest): boolean {
  if (request.referenceType !== 'usage_record' || !request.referenceId) {
    return false
  }

  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('uniq_credit_usage_deduction') ||
    (message.includes('UNIQUE constraint failed') && message.includes('credit_transactions'))
  )
}
