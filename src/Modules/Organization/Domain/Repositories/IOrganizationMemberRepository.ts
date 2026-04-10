/**
 * IOrganizationMemberRepository
 * Domain Repository: contract for organization membership persistence.
 */

import { OrganizationMember } from '../Entities/OrganizationMember'
import type { IDatabaseAccess } from '@/Shared/Domain/IDatabaseAccess'

export interface IOrganizationMemberRepository {
  /** Finds a member by their user ID (assumes one membership per user). */
  findByUserId(userId: string): Promise<OrganizationMember | null>

  /** Finds a specific membership relationship. */
  findByUserAndOrgId(userId: string, orgId: string): Promise<OrganizationMember | null>

  /** Retrieves members belonging to a specific organization. */
  findByOrgId(orgId: string, limit?: number, offset?: number): Promise<OrganizationMember[]>

  /** Persists a new membership. */
  save(member: OrganizationMember): Promise<void>

  /** Removes a membership from the system. */
  remove(memberId: string): Promise<void>

  /** Returns total member count for an organization. */
  countByOrgId(orgId: string): Promise<number>

  /** Returns count of managers for an organization. */
  countManagersByOrgId(orgId: string): Promise<number>

  /** Updates membership details (e.g., role). */
  update(member: OrganizationMember): Promise<void>

  /** Returns a repository instance scoped to a transaction. */
  withTransaction(tx: IDatabaseAccess): IOrganizationMemberRepository
}

