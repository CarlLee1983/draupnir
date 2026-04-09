import type { UserProfile } from '../Aggregates/UserProfile'

export interface UserProfileFilters {
  role?: string
  status?: string
  keyword?: string
}

export interface IUserProfileRepository {
  findById(id: string): Promise<UserProfile | null>
  save(profile: UserProfile): Promise<void>
  update(profile: UserProfile): Promise<void>
  findAll(filters?: UserProfileFilters, limit?: number, offset?: number): Promise<UserProfile[]>
  count(filters?: UserProfileFilters): Promise<number>
}
