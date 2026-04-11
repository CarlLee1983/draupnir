// src/Modules/Contract/Domain/Repositories/IContractRepository.ts
import type { Contract } from '../Aggregates/Contract'

/** Persistence port for contract aggregates (CRUD-style access and expiry queries). */
export interface IContractRepository {
  /** Loads one contract by primary key, or null when missing. */
  findById(id: string): Promise<Contract | null>
  /** Loads the ACTIVE contract for a target id, or null. */
  findActiveByTargetId(targetId: string): Promise<Contract | null>
  /** Lists every contract for a target, newest first. */
  findByTargetId(targetId: string): Promise<Contract[]>
  /** Admin listing: all contracts ordered by `created_at` descending. */
  findAllOrdered(): Promise<Contract[]>
  /** ACTIVE contracts whose validity end falls within the next `days` (inclusive window vs now). */
  findExpiring(days: number): Promise<Contract[]>
  /** ACTIVE contracts whose validity end is on or before now. */
  findExpired(): Promise<Contract[]>
  /** Inserts a new aggregate row. */
  save(contract: Contract): Promise<void>
  /** Updates an existing aggregate row by id. */
  update(contract: Contract): Promise<void>
}
