import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { Organization } from '../Aggregates/Organization'

export interface IOrganizationRepository {
	findById(id: string): Promise<Organization | null>
	findBySlug(slug: string): Promise<Organization | null>
	save(org: Organization): Promise<void>
	update(org: Organization): Promise<void>
	findAll(limit?: number, offset?: number): Promise<Organization[]>
	count(): Promise<number>
	withTransaction(tx: IDatabaseAccess): IOrganizationRepository
}
