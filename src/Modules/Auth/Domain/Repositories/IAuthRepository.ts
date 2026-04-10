/**
 * IAuthRepository
 * Auth persistence port (dependency inversion).
 *
 * Defined in domain; implemented in infrastructure.
 */

import type { User } from '../Aggregates/User'
import type { Email } from '../ValueObjects/Email'

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
   * Retrieves all users matching the pagination criteria.
   */
  findAll(limit?: number, offset?: number): Promise<User[]>
}
