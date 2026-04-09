// src/Modules/Credit/Domain/Repositories/ICreditTransactionRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { CreditTransaction } from '../Entities/CreditTransaction'

export interface ICreditTransactionRepository {
  save(transaction: CreditTransaction): Promise<void>
  findByAccountId(
    accountId: string,
    limit?: number,
    offset?: number,
  ): Promise<CreditTransaction[]>
  countByAccountId(accountId: string): Promise<number>
  findByAccountIdAndTypes(
    accountId: string,
    types: string[],
    startDate?: Date,
    endDate?: Date,
  ): Promise<CreditTransaction[]>
  withTransaction(tx: IDatabaseAccess): ICreditTransactionRepository
}
