// src/Modules/Contract/Infrastructure/Repositories/ContractRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { Contract } from '../../Domain/Aggregates/Contract'

export class ContractRepository implements IContractRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<Contract | null> {
    const row = await this.db.table('contracts').where('id', '=', id).first()
    return row ? Contract.fromDatabase(row) : null
  }

  async findActiveByTargetId(targetId: string): Promise<Contract | null> {
    const row = await this.db.table('contracts')
      .where('target_id', '=', targetId)
      .where('status', '=', 'active')
      .first()
    return row ? Contract.fromDatabase(row) : null
  }

  async findByTargetId(targetId: string): Promise<Contract[]> {
    const rows = await this.db.table('contracts')
      .where('target_id', '=', targetId)
      .orderBy('created_at', 'DESC')
      .select()
    return rows.map((row) => Contract.fromDatabase(row))
  }

  async findExpiring(days: number): Promise<Contract[]> {
    const now = new Date()
    const threshold = new Date()
    threshold.setDate(threshold.getDate() + days)

    // 查詢 ACTIVE 且即將到期的合約
    // terms 欄位為 JSON，包含 validityPeriod.endDate
    // 在 memory ORM 中需特殊處理
    const rows = await this.db.table('contracts')
      .where('status', '=', 'active')
      .select()

    return rows
      .map((row) => Contract.fromDatabase(row))
      .filter((contract) => {
        const endDate = new Date(contract.terms.validityPeriod.endDate)
        return endDate > now && endDate <= threshold
      })
  }

  async findExpired(): Promise<Contract[]> {
    const now = new Date()
    const rows = await this.db.table('contracts')
      .where('status', '=', 'active')
      .select()

    return rows
      .map((row) => Contract.fromDatabase(row))
      .filter((contract) => {
        const endDate = new Date(contract.terms.validityPeriod.endDate)
        return endDate <= now
      })
  }

  async save(contract: Contract): Promise<void> {
    await this.db.table('contracts').insert(contract.toDatabaseRow())
  }

  async update(contract: Contract): Promise<void> {
    await this.db.table('contracts').where('id', '=', contract.id).update(contract.toDatabaseRow())
  }
}
