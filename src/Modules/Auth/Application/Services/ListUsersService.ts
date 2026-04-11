/**
 * ListUsersService
 * Application service: admin-style user directory with optional filters and pagination.
 *
 * Responsibilities:
 * - Load users and profiles, join display metadata (name, avatar)
 * - Filter by role, status, and keyword (email / display name)
 * - Sort by `createdAt` descending and apply page/limit
 *
 * Implementation note: loads full user and profile sets from repositories, then filters in
 * memory. Suitable for modest datasets; consider DB-level paging if lists grow large.
 */

import type { IUserProfileRepository } from '@/Modules/Profile/Domain/Repositories/IUserProfileRepository'
import { UserProfileMapper } from '@/Modules/Profile/Infrastructure/Mappers/UserProfileMapper'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { ListUsersQuery, ListUsersResponse, UserListItemDTO } from '../DTOs/UserListDTO'

/**
 * Service for retrieving and filtering a list of users.
 */
export class ListUsersService {
  /**
   * Creates an instance of ListUsersService.
   */
  constructor(
    private authRepository: IAuthRepository,
    private profileRepository: IUserProfileRepository,
  ) {}

  /**
   * Returns a paginated list of users matching the query parameters.
   */
  async execute(request: ListUsersQuery): Promise<ListUsersResponse> {
    try {
      const page = request.page ?? 1
      const limit = request.limit ?? 20
      const keyword = request.keyword?.trim().toLowerCase()

      const [users, profiles] = await Promise.all([
        this.authRepository.findAll(),
        this.profileRepository.findAll(),
      ])

      const profileById = new Map(profiles.map((profile) => [profile.id, profile] as const))

      const filtered = users
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .filter((user) => (request.role ? user.role.getValue() === request.role : true))
        .filter((user) => (request.status ? user.status === request.status : true))
        .map((user): UserListItemDTO => {
          const profile = profileById.get(user.id)
          const dto = profile ? UserProfileMapper.toDTO(profile) : null
          return {
            id: user.id,
            email: user.emailValue,
            role: user.role.getValue(),
            status: user.status,
            displayName: dto?.displayName ?? user.emailValue,
            avatarUrl: dto?.avatarUrl ?? null,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          }
        })
        .filter((user) => {
          if (!keyword) return true
          return (
            user.email.toLowerCase().includes(keyword) ||
            user.displayName.toLowerCase().includes(keyword)
          )
        })

      const total = filtered.length
      const offset = (page - 1) * limit
      const pageItems = filtered.slice(offset, offset + limit)

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users: pageItems,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to load users',
        error: error.message,
      }
    }
  }
}
