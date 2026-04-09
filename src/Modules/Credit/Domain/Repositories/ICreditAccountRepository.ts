// src/Modules/Credit/Domain/Repositories/ICreditAccountRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { CreditAccount } from '../Aggregates/CreditAccount'

export interface ICreditAccountRepository {
  findById(id: string): Promise<CreditAccount | null>
  findByOrgId(orgId: string): Promise<CreditAccount | null>
  save(account: CreditAccount): Promise<void>
  update(account: CreditAccount): Promise<void>
  withTransaction(tx: IDatabaseAccess): ICreditAccountRepository
}
