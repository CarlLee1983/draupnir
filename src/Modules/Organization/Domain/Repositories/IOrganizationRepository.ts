/**
 * IOrganizationRepository
 * Domain Repository: contract for organization persistence.
 */

import type { IDatabaseAccess } from '@/Shared/Domain/IDatabaseAccess'
import type { Organization } from '../Aggregates/Organization'

export interface IOrganizationRepository {
  /** Finds an organization by its unique identifier. */
  findById(id: string): Promise<Organization | null>

  /**
   * Finds an organization by id with a row-level lock (SELECT ... FOR UPDATE).
   *
   * MUST be called inside an open transaction — the lock is bound to the current
   * transaction and released on commit/rollback. Used by
   * ProvisionOrganizationDefaultsService to serialize concurrent Bifrost Team
   * provisioning attempts for the same organization.
   */
  findByIdForUpdate(id: string): Promise<Organization | null>

  /** Finds an organization by its unique URL slug. */
  findBySlug(slug: string): Promise<Organization | null>

  /** Persists a new organization. */
  save(org: Organization): Promise<void>

  /** Updates an existing organization. */
  update(org: Organization): Promise<void>

  /** Retrieves a paginated list of organizations. */
  findAll(limit?: number, offset?: number): Promise<Organization[]>

  /** Returns the total count of organizations. */
  count(): Promise<number>

  /** Returns a repository instance scoped to a transaction. */
  withTransaction(tx: IDatabaseAccess): IOrganizationRepository
}
