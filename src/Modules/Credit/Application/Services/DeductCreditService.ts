import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { CreditTransaction } from '../../Domain/Entities/CreditTransaction'
import { BalanceDepleted } from '../../Domain/Events/BalanceDepleted'
import { BalanceLow } from '../../Domain/Events/BalanceLow'
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import { TransactionType } from '../../Domain/ValueObjects/TransactionType'

/**
 * Request payload for deducting credits from an organization's account.
 */
export interface DeductCreditRequest {
  /** ID of the organization to deduct from. */
  orgId: string
  /** The string representation of the amount to deduct. */
  amount: string
  /** Optional type of the reference entity triggering this deduction (e.g., 'usage_record'). */
  referenceType?: string
  /** Optional ID of the reference entity for audit and idempotency. */
  referenceId?: string
  /** Optional human-readable description of the transaction. */
  description?: string
}

/**
 * Response payload for the credit deduction operation.
 */
export interface DeductCreditResponse {
  /** Indicates if the operation was successful. */
  success: boolean
  /** The new balance of the account after deduction, if successful. */
  newBalance?: string
  /** Error code if the operation failed. */
  error?: string
}

/**
 * Service responsible for deducting credits from an organization's account.
 *
 * Responsibilities:
 * - Validate the existence of the credit account.
 * - Calculate the new balance after deduction.
 * - Persist the updated account state and a new credit transaction atomically.
 * - Handle duplicate usage deductions gracefully (idempotency).
 * - Dispatch domain events for low or depleted balances.
 */
export class DeductCreditService {
  /**
   * Initializes the service with required repositories and database access.
   *
   * @param accountRepo Repository for managing credit accounts.
   * @param txRepo Repository for recording credit transactions.
   * @param db Database access for atomic transaction handling.
   */
  constructor(
    private readonly accountRepo: ICreditAccountRepository,
    private readonly txRepo: ICreditTransactionRepository,
    private readonly db: IDatabaseAccess,
  ) {}

  /**
   * Executes the credit deduction workflow.
   *
   * @param request The deduction parameters including amount and reference.
   * @returns A promise resolving to the operation result with the updated balance or error.
   */
  async execute(request: DeductCreditRequest): Promise<DeductCreditResponse> {
    const account = await this.accountRepo.findByOrgId(request.orgId)
    if (!account) {
      return { success: false, error: 'ACCOUNT_NOT_FOUND' }
    }

    // 1. Calculate the new state using the domain aggregate
    const updated = account.applyDeduction(request.amount)

    // 2. Prepare the audit transaction record
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
      // 3. Persist changes atomically
      await this.db.transaction(async (tx) => {
        const txAccountRepo = this.accountRepo.withTransaction(tx)
        const txTransactionRepo = this.txRepo.withTransaction(tx)
        await txAccountRepo.update(updated)
        await txTransactionRepo.save(transaction)
      })
    } catch (error: unknown) {
      // 4. Handle idempotency for usage records (prevents double charging)
      if (isUsageDeductionDuplicateError(error, request)) {
        const latestAccount = await this.accountRepo.findByOrgId(request.orgId)
        return { success: true, newBalance: latestAccount?.balance ?? account.balance }
      }
      throw error
    }

    // 5. Check thresholds and dispatch domain events for reactive systems
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

/**
 * Detects if a database error is due to a duplicate usage deduction.
 * 
 * @param error The error to inspect.
 * @param request The original deduction request.
 * @returns True if it's a known duplicate error for a usage record.
 */
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
