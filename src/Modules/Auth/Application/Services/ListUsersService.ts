import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IUserProfileRepository } from '@/Modules/Profile/Domain/Repositories/IUserProfileRepository'
import type { ListUsersQuery, ListUsersResponse, UserListItemDTO } from '../DTOs/UserListDTO'
import { UserProfileMapper } from '@/Modules/Profile/Infrastructure/Mappers/UserProfileMapper'

export class ListUsersService {
  constructor(
    private authRepository: IAuthRepository,
    private profileRepository: IUserProfileRepository,
  ) {}

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
        message: '取得使用者列表成功',
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
      return { success: false, message: error.message || '取得失敗', error: error.message }
    }
  }
}
