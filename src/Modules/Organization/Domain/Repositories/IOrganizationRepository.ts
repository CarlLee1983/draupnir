/**
 * IOrganizationRepository
 * Domain Repository: contract for organization persistence.
 */

import { Organization } from '../Aggregates/Organization'
import type { IDatabaseAccess } from '@/Shared/Domain/IDatabaseAccess'

export interface IOrganizationRepository {
  /** Finds an organization by its unique identifier. */
  findById(id: string): Promise<Organization | null>

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

