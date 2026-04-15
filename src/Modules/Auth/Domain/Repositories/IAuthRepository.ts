/**
 * IAuthRepository
 * Auth persistence port (dependency inversion).
 *
 * Defined in domain; implemented in infrastructure.
 */

import type { IDatabaseAccess } from '@/Shared/Domain/IDatabaseAccess'
import type { User } from '../Aggregates/User'
import type { Email } from '../ValueObjects/Email'
import type { RoleType } from '../ValueObjects/Role'

/**
 * Filters for narrowing down the user list query at the persistence layer.
 * role and status are pushed to SQL WHERE; limit/offset control pagination.
 */
export interface UserListFilters {
  readonly role?: string
  readonly status?: string
  readonly limit?: number
  readonly offset?: number
}

/**
 * Port for managing persistence of User aggregates.
 */
export interface IAuthRepository {
  /**
   * Retrieves a User aggregate by its unique ID.
   */
  findById(id: string): Promise<User | null>

  /**
   * Retrieves a User aggregate by its registered email address.
   */
  findByEmail(email: Email): Promise<User | null>

  /**
   * Retrieves a User aggregate linked to the given Google OAuth subject id.
   */
  findByGoogleId(googleId: string): Promise<User | null>

  /**
   * Checks if an account already exists with the given email address.
   */
  emailExists(email: Email): Promise<boolean>

  /**
   * Persists a User aggregate (insert or update).
   */
  save(user: User): Promise<void>

  /**
   * Deletes a user account from the store.
   */
  delete(id: string): Promise<void>

  /**
   * Retrieves users matching the given filters, ordered by createdAt DESC.
   * role and status are applied as SQL WHERE conditions.
   */
  findAll(filters?: UserListFilters): Promise<User[]>

  /**
   * Returns the total count of users matching the given role/status filters.
   * Used for server-side pagination metadata.
   */
  countAll(filters?: UserListFilters): Promise<number>

  /**
   * Updates the system role of a user.
   * Must be called within a transaction when combined with org operations.
   */
  updateRole(userId: string, role: RoleType): Promise<void>

  /**
   * Returns a repository instance scoped to the given transaction.
   */
  withTransaction(tx: IDatabaseAccess): IAuthRepository
}
