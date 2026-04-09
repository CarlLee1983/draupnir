import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import { OrganizationMember } from '../../Domain/Entities/OrganizationMember'

export class OrganizationMemberRepository implements IOrganizationMemberRepository {
	constructor(private readonly db: IDatabaseAccess) {}

	async findByUserId(userId: string): Promise<OrganizationMember | null> {
		const row = await this.db.table('organization_members').where('user_id', '=', userId).first()
		return row ? OrganizationMember.fromDatabase(row) : null
	}

	async findByUserAndOrgId(userId: string, orgId: string): Promise<OrganizationMember | null> {
		const row = await this.db
			.table('organization_members')
			.where('user_id', '=', userId)
			.where('organization_id', '=', orgId)
			.first()
		return row ? OrganizationMember.fromDatabase(row) : null
	}

	async findByOrgId(orgId: string, limit?: number, offset?: number): Promise<OrganizationMember[]> {
		let query = this.db.table('organization_members').where('organization_id', '=', orgId)
		if (offset != null && offset > 0) {
			query = query.offset(offset)
		}
		if (limit != null) {
			query = query.limit(limit)
		}
		const rows = await query.select()
		return rows.map((row) => OrganizationMember.fromDatabase(row))
	}

	async save(member: OrganizationMember): Promise<void> {
		await this.db.table('organization_members').insert(member.toDatabaseRow())
	}

	async remove(memberId: string): Promise<void> {
		await this.db.table('organization_members').where('id', '=', memberId).delete()
	}

	async countByOrgId(orgId: string): Promise<number> {
		return this.db.table('organization_members').where('organization_id', '=', orgId).count()
	}

	async countManagersByOrgId(orgId: string): Promise<number> {
		return this.db
			.table('organization_members')
			.where('organization_id', '=', orgId)
			.where('role', '=', 'manager')
			.count()
	}

	async update(member: OrganizationMember): Promise<void> {
		await this.db.table('organization_members').where('id', '=', member.id).update(member.toDatabaseRow())
	}

	withTransaction(tx: IDatabaseAccess): OrganizationMemberRepository {
		return new OrganizationMemberRepository(tx)
	}
}
