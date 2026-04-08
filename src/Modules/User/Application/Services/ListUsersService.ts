import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import type { ListUsersRequest, ListUsersResponse } from '../DTOs/UserProfileDTO'

export class ListUsersService {
  constructor(private profileRepository: IUserProfileRepository) {}

  async execute(request: ListUsersRequest): Promise<ListUsersResponse> {
    try {
      const page = request.page ?? 1
      const limit = request.limit ?? 20
      const offset = (page - 1) * limit

      const filters = {
        role: request.role,
        status: request.status,
        keyword: request.keyword,
      }

      const [users, total] = await Promise.all([
        this.profileRepository.findAll(filters, limit, offset),
        this.profileRepository.count(filters),
      ])

      return {
        success: true,
        message: '取得使用者列表成功',
        data: {
          users: users.map((u) => u.toDTO()),
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
