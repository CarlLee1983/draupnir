import type { Application } from '../Aggregates/Application'

export interface IApplicationRepository {
	findById(id: string): Promise<Application | null>
	findByOrgId(orgId: string, limit?: number, offset?: number): Promise<Application[]>
	save(application: Application): Promise<void>
	update(application: Application): Promise<void>
	delete(id: string): Promise<void>
	countByOrgId(orgId: string): Promise<number>
}
