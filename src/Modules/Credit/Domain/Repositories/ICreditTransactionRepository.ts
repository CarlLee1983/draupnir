// src/Modules/Credit/Domain/Repositories/ICreditTransactionRepository.ts
import type { IDatabaseAccess } from '@/Shared/Domain/IDatabaseAccess'
import type { CreditTransaction } from '../Entities/CreditTransaction'

/**
 * Interface for CreditTransaction Repository
 */
export interface ICreditTransactionRepository {
  /** Persists a single transaction record. */
  save(transaction: CreditTransaction): Promise<void>
  /** Retrieves transactions for an account with pagination. */
  findByAccountId(accountId: string, limit?: number, offset?: number): Promise<CreditTransaction[]>
  /** Counts the total number of transactions for an account. */
  countByAccountId(accountId: string): Promise<number>
  /** Retrieves filtered transactions by type and date range. */
  findByAccountIdAndTypes(
    accountId: string,
    types: string[],
    startDate?: Date,
    endDate?: Date,
  ): Promise<CreditTransaction[]>
  /** Returns a new repository instance scoped to a transaction. */
  withTransaction(tx: IDatabaseAccess): ICreditTransactionRepository
}
