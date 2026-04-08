import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { OrganizationInvitation } from '../Entities/OrganizationInvitation'

export interface IOrganizationInvitationRepository {
	save(invitation: OrganizationInvitation): Promise<void>
	findById(id: string): Promise<OrganizationInvitation | null>
	findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null>
	findByOrgId(orgId: string): Promise<OrganizationInvitation[]>
	markAsAccepted(invitationId: string): Promise<void>
	cancel(invitationId: string): Promise<void>
	deleteExpired(): Promise<void>
	withTransaction(tx: IDatabaseAccess): IOrganizationInvitationRepository
}
