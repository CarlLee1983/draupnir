import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { AppApiKey } from '../../Domain/Aggregates/AppApiKey'
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import { AppApiKeyMapper } from '../Mappers/AppApiKeyMapper'

export class AppApiKeyRepository implements IAppApiKeyRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<AppApiKey | null> {
    const row = await this.db.table('app_api_keys').where('id', '=', id).first()
    return row ? AppApiKey.fromDatabase(row) : null
  }

  async findByOrgId(orgId: string, limit?: number, offset?: number): Promise<AppApiKey[]> {
    let query = this.db
      .table('app_api_keys')
      .where('org_id', '=', orgId)
      .orderBy('created_at', 'DESC')
    if (offset != null && offset > 0) {
      query = query.offset(offset)
    }
    if (limit != null) {
      query = query.limit(limit)
    }
    const rows = await query.select()
    return rows.map((row) => AppApiKey.fromDatabase(row))
  }

  async findActiveByOrgId(orgId: string): Promise<AppApiKey[]> {
    const rows = await this.db
      .table('app_api_keys')
      .where('org_id', '=', orgId)
      .where('status', '=', 'active')
      .select()
    return rows.map((row) => AppApiKey.fromDatabase(row))
  }

  async findByKeyHash(keyHash: string): Promise<AppApiKey | null> {
    const row = await this.db.table('app_api_keys').where('key_hash', '=', keyHash).first()
    return row ? AppApiKey.fromDatabase(row) : null
  }

  async findByPreviousKeyHash(keyHash: string): Promise<AppApiKey | null> {
    const row = await this.db.table('app_api_keys').where('previous_key_hash', '=', keyHash).first()
    return row ? AppApiKey.fromDatabase(row) : null
  }

  async findWithExpiredGracePeriod(): Promise<AppApiKey[]> {
    const now = new Date().toISOString()
    const rows = await this.db
      .table('app_api_keys')
      .where('status', '=', 'active')
      .where('grace_period_ends_at', '<', now)
      .select()
    return rows.map((row) => AppApiKey.fromDatabase(row))
  }

  async save(appApiKey: AppApiKey): Promise<void> {
    await this.db.table('app_api_keys').insert(AppApiKeyMapper.toDatabaseRow(appApiKey))
  }

  async update(appApiKey: AppApiKey): Promise<void> {
    await this.db
      .table('app_api_keys')
      .where('id', '=', appApiKey.id)
      .update(AppApiKeyMapper.toDatabaseRow(appApiKey))
  }

  async delete(id: string): Promise<void> {
    await this.db.table('app_api_keys').where('id', '=', id).delete()
  }

  async countByOrgId(orgId: string): Promise<number> {
    return this.db.table('app_api_keys').where('org_id', '=', orgId).count()
  }

  withTransaction(tx: IDatabaseAccess): AppApiKeyRepository {
    return new AppApiKeyRepository(tx)
  }
}
