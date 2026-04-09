import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ApiKey } from '../Aggregates/ApiKey'

export interface IApiKeyRepository {
	findById(id: string): Promise<ApiKey | null>
	findByOrgId(orgId: string, limit?: number, offset?: number): Promise<ApiKey[]>
	findActiveByOrgId(orgId: string): Promise<ApiKey[]>
	findSuspendedByOrgId(orgId: string, reason: string): Promise<ApiKey[]>
	findByKeyHash(keyHash: string): Promise<ApiKey | null>
	save(apiKey: ApiKey): Promise<void>
	update(apiKey: ApiKey): Promise<void>
	delete(id: string): Promise<void>
	countByOrgId(orgId: string): Promise<number>
	countActiveByOrgId(orgId: string): Promise<number>
	withTransaction(tx: IDatabaseAccess): IApiKeyRepository
}
