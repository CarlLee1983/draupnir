import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { OrganizationMember } from '../Entities/OrganizationMember'

export interface IOrganizationMemberRepository {
	findByUserId(userId: string): Promise<OrganizationMember | null>
	findByUserAndOrgId(userId: string, orgId: string): Promise<OrganizationMember | null>
	findByOrgId(orgId: string, limit?: number, offset?: number): Promise<OrganizationMember[]>
	save(member: OrganizationMember): Promise<void>
	remove(memberId: string): Promise<void>
	countByOrgId(orgId: string): Promise<number>
	countManagersByOrgId(orgId: string): Promise<number>
	update(member: OrganizationMember): Promise<void>
	withTransaction(tx: IDatabaseAccess): IOrganizationMemberRepository
}
