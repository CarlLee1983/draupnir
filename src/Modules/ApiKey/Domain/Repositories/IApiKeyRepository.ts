/**
 * IApiKeyRepository
 * Domain Repository: contract for API key persistence.
 */

import { ApiKey } from '../Aggregates/ApiKey'
import type { IDatabaseAccess } from '@/Shared/Domain/IDatabaseAccess'

export interface IApiKeyRepository {
  /** Finds a key by its unique identifier. */
  findById(id: string): Promise<ApiKey | null>

  /** Retrieves all keys belonging to an organization. */
  findByOrgId(orgId: string, limit?: number, offset?: number): Promise<ApiKey[]>

  /** Retrieves only active keys for an organization. */
  findActiveByOrgId(orgId: string): Promise<ApiKey[]>

  /** Retrieves keys suspended for a specific reason. */
  findSuspendedByOrgId(orgId: string, reason: string): Promise<ApiKey[]>

  /** Finds a key by its secure hash. */
  findByKeyHash(keyHash: string): Promise<ApiKey | null>

  /** Persists a new API key. */
  save(apiKey: ApiKey): Promise<void>

  /** Updates an existing API key. */
  update(apiKey: ApiKey): Promise<void>

  /** Removes an API key record (permanently). */
  delete(id: string): Promise<void>

  /** Returns the total count of keys for an organization. */
  countByOrgId(orgId: string): Promise<number>

  /** Returns the count of active keys for an organization. */
  countActiveByOrgId(orgId: string): Promise<number>

  /** Returns a repository instance scoped to a transaction. */
  withTransaction(tx: IDatabaseAccess): IApiKeyRepository
}

