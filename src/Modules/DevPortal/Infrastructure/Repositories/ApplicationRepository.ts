import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IApplicationRepository } from '../../Domain/Repositories/IApplicationRepository'
import { Application } from '../../Domain/Aggregates/Application'

export class ApplicationRepository implements IApplicationRepository {
	constructor(private readonly db: IDatabaseAccess) {}

	async findById(id: string): Promise<Application | null> {
		const row = await this.db.table('applications').where('id', '=', id).first()
		return row ? Application.fromDatabase(row) : null
	}

	async findByOrgId(orgId: string, limit?: number, offset?: number): Promise<Application[]> {
		let query = this.db.table('applications').where('org_id', '=', orgId).orderBy('created_at', 'DESC')
		if (offset != null && offset > 0) {
			query = query.offset(offset)
		}
		if (limit != null) {
			query = query.limit(limit)
		}
		const rows = await query.select()
		return rows.map((row) => Application.fromDatabase(row))
	}

	async save(application: Application): Promise<void> {
		await this.db.table('applications').insert(application.toDatabaseRow())
	}

	async update(application: Application): Promise<void> {
		await this.db.table('applications').where('id', '=', application.id).update(application.toDatabaseRow())
	}

	async delete(id: string): Promise<void> {
		await this.db.table('applications').where('id', '=', id).delete()
	}

	async countByOrgId(orgId: string): Promise<number> {
		return this.db.table('applications').where('org_id', '=', orgId).count()
	}
}
