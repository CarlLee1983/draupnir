import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { AppApiKey } from '../Aggregates/AppApiKey'

export interface IAppApiKeyRepository {
	findById(id: string): Promise<AppApiKey | null>
	findByOrgId(orgId: string, limit?: number, offset?: number): Promise<AppApiKey[]>
	findActiveByOrgId(orgId: string): Promise<AppApiKey[]>
	findByKeyHash(keyHash: string): Promise<AppApiKey | null>
	findByPreviousKeyHash(keyHash: string): Promise<AppApiKey | null>
	findWithExpiredGracePeriod(): Promise<AppApiKey[]>
	save(appApiKey: AppApiKey): Promise<void>
	update(appApiKey: AppApiKey): Promise<void>
	delete(id: string): Promise<void>
	countByOrgId(orgId: string): Promise<number>
	withTransaction(tx: IDatabaseAccess): IAppApiKeyRepository
}
