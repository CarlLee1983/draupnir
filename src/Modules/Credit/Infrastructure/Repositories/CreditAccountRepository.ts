// src/Modules/Credit/Infrastructure/Repositories/CreditAccountRepository.ts
/**
 * CreditAccountRepository
 * Infrastructure: SQL implementation for credit account persistence.
 */

import { CreditAccount } from '../../Domain/Aggregates/CreditAccount'
import { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export class CreditAccountRepository implements ICreditAccountRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  /** Finds an account by its unique identifier. */
  async findById(id: string): Promise<CreditAccount | null> {
    const row = await this.db.table('credit_accounts').where('id', '=', id).first()
    return row ? CreditAccount.fromDatabase(row) : null
  }

  /** Finds an account by organization ID. */
  async findByOrgId(orgId: string): Promise<CreditAccount | null> {
    const row = await this.db.table('credit_accounts').where('org_id', '=', orgId).first()
    return row ? CreditAccount.fromDatabase(row) : null
  }

  /** Persists a new credit account. */
  async save(account: CreditAccount): Promise<void> {
    await this.db.table('credit_accounts').insert(account.toDatabaseRow())
  }

  /** Updates an existing credit account. */
  async update(account: CreditAccount): Promise<void> {
    await this.db
      .table('credit_accounts')
      .where('id', '=', account.id)
      .update(account.toDatabaseRow())
  }

  /** Returns a new repository instance scoped to a transaction. */
  withTransaction(tx: IDatabaseAccess): CreditAccountRepository {
    return new CreditAccountRepository(tx)
  }
}

