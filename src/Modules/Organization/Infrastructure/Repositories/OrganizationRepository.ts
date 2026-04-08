import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import { Organization } from '../../Domain/Aggregates/Organization'

export class OrganizationRepository implements IOrganizationRepository {
	constructor(private readonly db: IDatabaseAccess) {}

	async findById(id: string): Promise<Organization | null> {
		const row = await this.db.table('organizations').where('id', '=', id).first()
		return row ? Organization.fromDatabase(row) : null
	}

	async findBySlug(slug: string): Promise<Organization | null> {
		const row = await this.db.table('organizations').where('slug', '=', slug).first()
		return row ? Organization.fromDatabase(row) : null
	}

	async save(org: Organization): Promise<void> {
		await this.db.table('organizations').insert(org.toDatabaseRow())
	}

	async update(org: Organization): Promise<void> {
		await this.db.table('organizations').where('id', '=', org.id).update(org.toDatabaseRow())
	}

	async findAll(limit?: number, offset?: number): Promise<Organization[]> {
		let query = this.db.table('organizations').orderBy('created_at', 'DESC')
		if (offset != null && offset > 0) {
			query = query.offset(offset)
		}
		if (limit != null) {
			query = query.limit(limit)
		}
		const rows = await query.select()
		return rows.map((row) => Organization.fromDatabase(row))
	}

	async count(): Promise<number> {
		return this.db.table('organizations').count()
	}

	withTransaction(tx: IDatabaseAccess): OrganizationRepository {
		return new OrganizationRepository(tx)
	}
}
