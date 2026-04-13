// src/Modules/Credit/Infrastructure/Repositories/CreditTransactionRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { CreditTransaction } from '../../Domain/Entities/CreditTransaction'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import { CreditTransactionMapper } from '../Mappers/CreditTransactionMapper'

export class CreditTransactionRepository implements ICreditTransactionRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(transaction: CreditTransaction): Promise<void> {
    await this.db
      .table('credit_transactions')
      .insert(CreditTransactionMapper.toDatabaseRow(transaction))
  }

  async findByAccountId(
    accountId: string,
    limit?: number,
    offset?: number,
  ): Promise<CreditTransaction[]> {
    let query = this.db
      .table('credit_transactions')
      .where('credit_account_id', '=', accountId)
      .orderBy('created_at', 'DESC')
    if (offset != null && offset > 0) query = query.offset(offset)
    if (limit != null) query = query.limit(limit)
    const rows = await query.select()
    return rows.map((r) => CreditTransaction.fromDatabase(r))
  }

  async countByAccountId(accountId: string): Promise<number> {
    const result = await this.db
      .table('credit_transactions')
      .where('credit_account_id', '=', accountId)
      .count()
    return Number(result)
  }

  async findByAccountIdAndTypes(
    accountId: string,
    types: string[],
    startDate?: Date,
    endDate?: Date,
  ): Promise<CreditTransaction[]> {
    let query = this.db.table('credit_transactions').where('credit_account_id', '=', accountId)
    if (startDate && endDate) {
      query = query.whereBetween('created_at', [startDate, endDate])
    }
    const rows = await query.orderBy('created_at', 'DESC').select()
    return rows
      .filter((r) => types.includes(r.type as string))
      .map((r) => CreditTransaction.fromDatabase(r))
  }

  withTransaction(tx: IDatabaseAccess): CreditTransactionRepository {
    return new CreditTransactionRepository(tx)
  }
}
