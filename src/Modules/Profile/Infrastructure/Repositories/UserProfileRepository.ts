import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IUserProfileRepository, UserProfileFilters } from '../../Domain/Repositories/IUserProfileRepository'
import { UserProfile } from '../../Domain/Aggregates/UserProfile'
import { UserProfileMapper } from '../Mappers/UserProfileMapper'

export class UserProfileRepository implements IUserProfileRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<UserProfile | null> {
    const row = await this.db.table('user_profiles').where('id', '=', id).first()
    return row ? UserProfileMapper.fromDatabase(row as Record<string, unknown>) : null
  }

  async save(profile: UserProfile): Promise<void> {
    await this.db.table('user_profiles').insert(UserProfileMapper.toDatabaseRow(profile))
  }

  async update(profile: UserProfile): Promise<void> {
    await this.db
      .table('user_profiles')
      .where('id', '=', profile.id)
      .update(UserProfileMapper.toDatabaseRow(profile))
  }

  async findAll(filters?: UserProfileFilters, limit?: number, offset?: number): Promise<UserProfile[]> {
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

  async count(filters?: UserProfileFilters): Promise<number> {
    let query = this.db.table('user_profiles')
    if (filters?.keyword) {
      query = query.where('display_name', 'LIKE', `%${filters.keyword}%`)
    }
    return query.count()
  }
}
