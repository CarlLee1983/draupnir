import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import { OrganizationInvitation } from '../../Domain/Entities/OrganizationInvitation'

export class OrganizationInvitationRepository implements IOrganizationInvitationRepository {
	constructor(private readonly db: IDatabaseAccess) {}

	async save(invitation: OrganizationInvitation): Promise<void> {
		await this.db.table('organization_invitations').insert(invitation.toDatabaseRow())
	}

	async findById(id: string): Promise<OrganizationInvitation | null> {
		const row = await this.db.table('organization_invitations').where('id', '=', id).first()
		return row ? OrganizationInvitation.fromDatabase(row) : null
	}

	async findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null> {
		const row = await this.db.table('organization_invitations').where('token_hash', '=', tokenHash).first()
		return row ? OrganizationInvitation.fromDatabase(row) : null
	}

	async findByOrgId(orgId: string): Promise<OrganizationInvitation[]> {
		const rows = await this.db
			.table('organization_invitations')
			.where('organization_id', '=', orgId)
			.orderBy('created_at', 'DESC')
			.select()
		return rows.map((row) => OrganizationInvitation.fromDatabase(row))
	}

	async markAsAccepted(invitationId: string): Promise<void> {
		await this.db.table('organization_invitations').where('id', '=', invitationId).update({ status: 'accepted' })
	}

	async cancel(invitationId: string): Promise<void> {
		await this.db.table('organization_invitations').where('id', '=', invitationId).update({ status: 'cancelled' })
	}

	async deleteExpired(): Promise<void> {
		await this.db
			.table('organization_invitations')
			.where('expires_at', '<', new Date().toISOString())
			.where('status', '=', 'pending')
			.delete()
	}

	withTransaction(tx: IDatabaseAccess): OrganizationInvitationRepository {
		return new OrganizationInvitationRepository(tx)
	}
}
