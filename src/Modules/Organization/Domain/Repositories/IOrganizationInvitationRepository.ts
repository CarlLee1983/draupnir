import type { IDatabaseAccess } from '@/Shared/Domain/IDatabaseAccess'
import type { OrganizationInvitation } from '../Entities/OrganizationInvitation'

export interface IOrganizationInvitationRepository {
  save(invitation: OrganizationInvitation): Promise<void>
  update(invitation: OrganizationInvitation): Promise<void>
  findById(id: string): Promise<OrganizationInvitation | null>
  findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null>
  findByOrgId(orgId: string): Promise<OrganizationInvitation[]>
  deleteExpired(): Promise<void>
  withTransaction(tx: IDatabaseAccess): IOrganizationInvitationRepository
}
