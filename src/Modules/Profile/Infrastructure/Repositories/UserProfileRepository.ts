import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { UserProfile } from '../../Domain/Aggregates/UserProfile'
import type {
  IUserProfileRepository,
  UserProfileFilters,
} from '../../Domain/Repositories/IUserProfileRepository'
import { UserProfileMapper } from '../Mappers/UserProfileMapper'

/**
 * Implementation of IUserProfileRepository using a database access layer.
 */
export class UserProfileRepository implements IUserProfileRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  /**
   * Finds a user profile by the Auth user ID (WHERE user_id = ?).
   * @param userId - The Auth module user UUID.
   */
  async findByUserId(userId: string): Promise<UserProfile | null> {
    const row = await this.db.table('user_profiles').where('user_id', '=', userId).first()
    return row ? UserProfileMapper.fromDatabase(row as Record<string, unknown>) : null
  }

  /**
   * Persists a new user profile.
   * @param profile - The profile instance to save.
   */
  async save(profile: UserProfile): Promise<void> {
    await this.db.table('user_profiles').insert(UserProfileMapper.toDatabaseRow(profile))
  }

  /**
   * Updates an existing user profile.
   * @param profile - The profile instance with updated data.
   */
  async update(profile: UserProfile): Promise<void> {
    await this.db
      .table('user_profiles')
      .where('id', '=', profile.id)
      .update(UserProfileMapper.toDatabaseRow(profile))
  }

  /**
   * Finds all user profiles matching the criteria.
   * @param filters - Search filters.
   * @param limit - Max results.
   * @param offset - Pagination offset.
   */
  async findAll(
    filters?: UserProfileFilters,
    limit?: number,
    offset?: number,
  ): Promise<UserProfile[]> {
    let query = this.db.table('user_profiles')

    if (filters?.keyword) {
      query = query.where('display_name', 'LIKE', `%${filters.keyword}%`)
    }

    if (offset) query = query.offset(offset)
    if (limit) query = query.limit(limit)
    query = query.orderBy('created_at', 'DESC')

    const rows = await query.select()
    return rows.map((row) => UserProfileMapper.fromDatabase(row as Record<string, unknown>))
  }

  /**
   * Counts the total number of profiles matching the criteria.
   * @param filters - Search filters.
   */
  async count(filters?: UserProfileFilters): Promise<number> {
    let query = this.db.table('user_profiles')
    if (filters?.keyword) {
      query = query.where('display_name', 'LIKE', `%${filters.keyword}%`)
    }
    return query.count()
  }
}
