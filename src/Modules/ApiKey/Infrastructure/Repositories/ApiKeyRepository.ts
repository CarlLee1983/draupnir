import { coalesce, sum } from '@/Shared/Infrastructure/Database/AggregateSpec'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { ApiKey } from '../../Domain/Aggregates/ApiKey'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import { ApiKeyMapper } from '../Mappers/ApiKeyMapper'

export class ApiKeyRepository implements IApiKeyRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<ApiKey | null> {
    const row = await this.db.table('api_keys').where('id', '=', id).first()
    return row ? ApiKey.fromDatabase(row) : null
  }

  async findByOrgId(orgId: string, limit?: number, offset?: number): Promise<ApiKey[]> {
    let query = this.db.table('api_keys').where('org_id', '=', orgId).orderBy('created_at', 'DESC')
    if (offset != null && offset > 0) {
      query = query.offset(offset)
    }
    if (limit != null) {
      query = query.limit(limit)
    }
    const rows = await query.select()
    return rows.map((row) => ApiKey.fromDatabase(row))
  }

  async findActiveByOrgId(orgId: string): Promise<ApiKey[]> {
    const rows = await this.db
      .table('api_keys')
      .where('org_id', '=', orgId)
      .where('status', '=', 'active')
      .select()
    return rows.map((row) => ApiKey.fromDatabase(row))
  }

  async findSuspendedByOrgId(orgId: string, reason: string): Promise<ApiKey[]> {
    const rows = await this.db
      .table('api_keys')
      .where('org_id', '=', orgId)
      .where('status', '=', 'suspended_no_credit')
      .where('suspension_reason', '=', reason)
      .select()
    return rows.map((row) => ApiKey.fromDatabase(row))
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    const row = await this.db.table('api_keys').where('key_hash', '=', keyHash).first()
    return row ? ApiKey.fromDatabase(row) : null
  }

  async save(apiKey: ApiKey): Promise<void> {
    await this.db.table('api_keys').insert(ApiKeyMapper.toDatabaseRow(apiKey))
  }

  async update(apiKey: ApiKey): Promise<void> {
    await this.db
      .table('api_keys')
      .where('id', '=', apiKey.id)
      .update(ApiKeyMapper.toDatabaseRow(apiKey))
  }

  async countByOrgId(orgId: string): Promise<number> {
    return this.db.table('api_keys').where('org_id', '=', orgId).count()
  }

  async sumQuotaAllocatedActiveByOrgId(orgId: string): Promise<number> {
    const rows = await this.db
      .table('api_keys')
      .where('org_id', '=', orgId)
      .where('status', '=', 'active')
      .aggregate<{ total: unknown }>({
        select: { total: coalesce(sum('quota_allocated'), 0) },
      })
    const v = rows[0]?.total
    if (typeof v === 'number') return v
    if (typeof v === 'string') return Number.parseInt(v, 10) || 0
    return 0
  }

  async delete(id: string): Promise<void> {
    await this.db.table('api_keys').where('id', '=', id).delete()
  }

  async countActiveByOrgId(orgId: string): Promise<number> {
    return this.db
      .table('api_keys')
      .where('org_id', '=', orgId)
      .where('status', '=', 'active')
      .count()
  }

  async findByBifrostVirtualKeyId(bifrostVirtualKeyId: string): Promise<ApiKey | null> {
    const row = await this.db
      .table('api_keys')
      .where('bifrost_virtual_key_id', '=', bifrostVirtualKeyId)
      .first()
    return row ? ApiKey.fromDatabase(row) : null
  }

  async findByOrgAndAssignedMember(
    orgId: string,
    assignedMemberId: string,
    limit?: number,
    offset?: number,
  ): Promise<ApiKey[]> {
    let query = this.db
      .table('api_keys')
      .where('org_id', '=', orgId)
      .where('assigned_member_id', '=', assignedMemberId)
      .orderBy('created_at', 'DESC')
    if (offset != null && offset > 0) query = query.offset(offset)
    if (limit != null) query = query.limit(limit)
    const rows = await query.select()
    return rows.map((row) => ApiKey.fromDatabase(row))
  }

  async countByOrgAndAssignedMember(orgId: string, assignedMemberId: string): Promise<number> {
    return this.db
      .table('api_keys')
      .where('org_id', '=', orgId)
      .where('assigned_member_id', '=', assignedMemberId)
      .count()
  }

  async clearAssignmentsForMember(orgId: string, memberUserId: string): Promise<void> {
    await this.db
      .table('api_keys')
      .where('org_id', '=', orgId)
      .where('assigned_member_id', '=', memberUserId)
      .update({ assigned_member_id: null, updated_at: new Date().toISOString() })
  }

  withTransaction(tx: IDatabaseAccess): ApiKeyRepository {
    return new ApiKeyRepository(tx)
  }
}
