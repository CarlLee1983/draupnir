/**
 * ListUsersService
 * Application service: admin-style user directory with optional filters and pagination.
 *
 * Responsibilities:
 * - Load users and profiles, join display metadata (name, avatar)
 * - Filter by role and status at the DB layer via IAuthRepository
 * - Filter by keyword (email / display name) in-memory (requires profile join)
 * - Apply server-side pagination (limit/offset at DB layer when no keyword)
 *
 * Implementation note: role/status filtering is pushed to SQL WHERE for efficiency.
 * keyword filtering remains in-memory as it requires a profile join for displayName.
 */

import type { IUserProfileRepository } from '@/Modules/Profile/Domain/Repositories/IUserProfileRepository'
import { UserProfileMapper } from '@/Modules/Profile/Infrastructure/Mappers/UserProfileMapper'
import type { IAuthRepository, UserListFilters } from '../../Domain/Repositories/IAuthRepository'
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
      const offset = (page - 1) * limit
      const keyword = request.keyword?.trim().toLowerCase()

      const repoFilters: UserListFilters = {
        role: request.role,
        status: request.status,
      }

      let total: number
      let pageItems: UserListItemDTO[]

      if (!keyword) {
        // No keyword: pagination fully at DB layer
        const [count, users, profiles] = await Promise.all([
          this.authRepository.countAll(repoFilters),
          this.authRepository.findAll({ ...repoFilters, limit, offset }),
          this.profileRepository.findAll(),
        ])

        const profileById = new Map(profiles.map((profile) => [profile.id, profile] as const))

        total = count
        pageItems = users.map((user): UserListItemDTO => {
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
      } else {
        // keyword: fetch all matching role/status, then in-memory keyword filter + slice
        const [users, profiles] = await Promise.all([
          this.authRepository.findAll(repoFilters),
          this.profileRepository.findAll(),
        ])

        const profileById = new Map(profiles.map((profile) => [profile.id, profile] as const))

        const filtered = users
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
          .filter(
            (user) =>
              user.email.toLowerCase().includes(keyword) ||
              user.displayName.toLowerCase().includes(keyword),
          )

        total = filtered.length
        pageItems = filtered.slice(offset, offset + limit)
      }

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
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to load users',
        error: error.message,
      }
    }
  }
}
