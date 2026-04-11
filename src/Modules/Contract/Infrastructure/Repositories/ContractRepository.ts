// src/Modules/Contract/Infrastructure/Repositories/ContractRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { Contract } from '../../Domain/Aggregates/Contract'
import { ContractMapper } from '../Mappers/ContractMapper'

/** SQL-backed implementation of {@link IContractRepository} using the shared DB access layer. */
export class ContractRepository implements IContractRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  /** @inheritdoc */
  async findById(id: string): Promise<Contract | null> {
    const row = await this.db.table('contracts').where('id', '=', id).first()
    return row ? Contract.fromDatabase(row) : null
  }

  /** @inheritdoc */
  async findActiveByTargetId(targetId: string): Promise<Contract | null> {
    const row = await this.db
      .table('contracts')
      .where('target_id', '=', targetId)
      .where('status', '=', 'active')
      .first()
    return row ? Contract.fromDatabase(row) : null
  }

  /** @inheritdoc */
  async findByTargetId(targetId: string): Promise<Contract[]> {
    const rows = await this.db
      .table('contracts')
      .where('target_id', '=', targetId)
      .orderBy('created_at', 'DESC')
      .select()
    return rows.map((row) => Contract.fromDatabase(row))
  }

  /** @inheritdoc */
  async findAllOrdered(): Promise<Contract[]> {
    const rows = await this.db.table('contracts').orderBy('created_at', 'DESC').select()
    return rows.map((row) => Contract.fromDatabase(row))
  }

  /** @inheritdoc */
  async findExpiring(days: number): Promise<Contract[]> {
    const now = new Date()
    const threshold = new Date()
    threshold.setDate(threshold.getDate() + days)

    const rows = await this.db.table('contracts').where('status', '=', 'active').select()

    return rows
      .map((row) => Contract.fromDatabase(row))
      .filter((contract) => {
        const endDate = new Date(contract.terms.validityPeriod.endDate)
        return endDate > now && endDate <= threshold
      })
  }

  /** @inheritdoc */
  async findExpired(): Promise<Contract[]> {
    const now = new Date()
    const rows = await this.db.table('contracts').where('status', '=', 'active').select()

    return rows
      .map((row) => Contract.fromDatabase(row))
      .filter((contract) => {
        const endDate = new Date(contract.terms.validityPeriod.endDate)
        return endDate <= now
      })
  }

  /** @inheritdoc */
  async save(contract: Contract): Promise<void> {
    await this.db.table('contracts').insert(ContractMapper.toDatabaseRow(contract))
  }

  /** @inheritdoc */
  async update(contract: Contract): Promise<void> {
    await this.db.table('contracts').where('id', '=', contract.id).update(ContractMapper.toDatabaseRow(contract))
  }
}
