// src/Modules/Credit/Domain/Repositories/ICreditAccountRepository.ts
import type { IDatabaseAccess } from '@/Shared/Domain/IDatabaseAccess'
import type { CreditAccount } from '../Aggregates/CreditAccount'

/**
 * Interface for CreditAccount Repository
 * Defines the contract for organization credit accounts.
 */
export interface ICreditAccountRepository {
  /** Finds an account by its unique identifier. */
  findById(id: string): Promise<CreditAccount | null>
  /** Finds an account by organization ID. */
  findByOrgId(orgId: string): Promise<CreditAccount | null>
  /** Persists a new credit account. */
  save(account: CreditAccount): Promise<void>
  /** Updates an existing credit account. */
  update(account: CreditAccount): Promise<void>
  /** Returns a new repository instance scoped to a transaction. */
  withTransaction(tx: IDatabaseAccess): ICreditAccountRepository
}

