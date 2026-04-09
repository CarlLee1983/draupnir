// src/Modules/Contract/Domain/Repositories/IContractRepository.ts
import type { Contract } from '../Aggregates/Contract'

export interface IContractRepository {
  findById(id: string): Promise<Contract | null>
  findActiveByTargetId(targetId: string): Promise<Contract | null>
  findByTargetId(targetId: string): Promise<Contract[]>
  findExpiring(days: number): Promise<Contract[]>
  findExpired(): Promise<Contract[]>
  save(contract: Contract): Promise<void>
  update(contract: Contract): Promise<void>
}
