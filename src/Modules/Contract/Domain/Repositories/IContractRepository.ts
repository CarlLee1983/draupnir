// src/Modules/Contract/Domain/Repositories/IContractRepository.ts
import type { Contract } from '../Aggregates/Contract'

export interface IContractRepository {
  findById(id: string): Promise<Contract | null>
  findActiveByTargetId(targetId: string): Promise<Contract | null>
  findByTargetId(targetId: string): Promise<Contract[]>
  /** 管理後台：全部合約，依建立時間新到舊 */
  findAllOrdered(): Promise<Contract[]>
  findExpiring(days: number): Promise<Contract[]>
  findExpired(): Promise<Contract[]>
  save(contract: Contract): Promise<void>
  update(contract: Contract): Promise<void>
}
