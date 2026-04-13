import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { OrganizationInvitation } from '../../Domain/Entities/OrganizationInvitation'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import { OrganizationInvitationMapper } from '../Mappers/OrganizationInvitationMapper'

export class OrganizationInvitationRepository implements IOrganizationInvitationRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(invitation: OrganizationInvitation): Promise<void> {
    await this.db
      .table('organization_invitations')
      .insert(OrganizationInvitationMapper.toDatabaseRow(invitation))
  }

  async update(invitation: OrganizationInvitation): Promise<void> {
    await this.db
      .table('organization_invitations')
      .where('id', '=', invitation.id)
      .update(OrganizationInvitationMapper.toDatabaseRow(invitation))
  }

  async findById(id: string): Promise<OrganizationInvitation | null> {
    const row = await this.db.table('organization_invitations').where('id', '=', id).first()
    return row ? OrganizationInvitationMapper.toEntity(row) : null
  }

  async findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null> {
    const row = await this.db
      .table('organization_invitations')
      .where('token_hash', '=', tokenHash)
      .first()
    return row ? OrganizationInvitationMapper.toEntity(row) : null
  }

  async findByOrgId(orgId: string): Promise<OrganizationInvitation[]> {
    const rows = await this.db
      .table('organization_invitations')
      .where('organization_id', '=', orgId)
      .orderBy('created_at', 'DESC')
      .select()
    return rows.map((row) => OrganizationInvitationMapper.toEntity(row))
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
