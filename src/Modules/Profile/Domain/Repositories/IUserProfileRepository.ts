import type { UserProfile } from '../Aggregates/UserProfile'

/**
 * Filters for querying UserProfiles.
 */
export interface UserProfileFilters {
  keyword?: string
}

/**
 * Interface for UserProfile Repository
 * Defines the contract for profile data persistence.
 */
export interface IUserProfileRepository {
  /**
   * Finds a user profile by the Auth user ID (user_id column, not profile id).
   */
  findByUserId(userId: string): Promise<UserProfile | null>

  /**
   * Persists a new user profile.
   */
  save(profile: UserProfile): Promise<void>

  /**
   * Updates an existing user profile.
   */
  update(profile: UserProfile): Promise<void>

  /**
   * Finds all user profiles matching the criteria.
   */
  findAll(filters?: UserProfileFilters, limit?: number, offset?: number): Promise<UserProfile[]>

  /**
   * Counts the total number of profiles matching the criteria.
   */
  count(filters?: UserProfileFilters): Promise<number>
}
