// src/Modules/Credit/Infrastructure/Repositories/CreditAccountRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import { CreditAccount } from '../../Domain/Aggregates/CreditAccount'

export class CreditAccountRepository implements ICreditAccountRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<CreditAccount | null> {
    const row = await this.db.table('credit_accounts').where('id', '=', id).first()
    return row ? CreditAccount.fromDatabase(row) : null
  }

  async findByOrgId(orgId: string): Promise<CreditAccount | null> {
    const row = await this.db.table('credit_accounts').where('org_id', '=', orgId).first()
    return row ? CreditAccount.fromDatabase(row) : null
  }

  async save(account: CreditAccount): Promise<void> {
    await this.db.table('credit_accounts').insert(account.toDatabaseRow())
  }

  async update(account: CreditAccount): Promise<void> {
    await this.db.table('credit_accounts').where('id', '=', account.id).update(account.toDatabaseRow())
  }

  withTransaction(tx: IDatabaseAccess): CreditAccountRepository {
    return new CreditAccountRepository(tx)
  }
}
