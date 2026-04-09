import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import { ApiKey } from '../../Domain/Aggregates/ApiKey'

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
		await this.db.table('api_keys').insert(apiKey.toDatabaseRow())
	}

	async update(apiKey: ApiKey): Promise<void> {
		await this.db.table('api_keys').where('id', '=', apiKey.id).update(apiKey.toDatabaseRow())
	}

	async countByOrgId(orgId: string): Promise<number> {
		return this.db.table('api_keys').where('org_id', '=', orgId).count()
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

	withTransaction(tx: IDatabaseAccess): ApiKeyRepository {
		return new ApiKeyRepository(tx)
	}
}
