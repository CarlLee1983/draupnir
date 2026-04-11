/**
 * GetUserDetailService
 * Application service: retrieves a single user's account details by ID.
 *
 * Introduced to keep the Presentation layer from depending on `IAuthRepository` directly.
 */

import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'

/** Projected DTO returned by {@link GetUserDetailService}. */
export interface UserDetailDTO {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface GetUserDetailResponse {
  success: boolean
  message: string
  data?: UserDetailDTO
}

export class GetUserDetailService {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(userId: string): Promise<GetUserDetailResponse> {
    try {
      const user = await this.authRepository.findById(userId)

      if (!user) {
        return { success: false, message: 'User not found' }
      }

      return {
        success: true,
        message: 'User retrieved successfully',
        data: {
          id: user.id,
          email: user.emailValue,
          role: user.role.getValue(),
          status: user.status as string,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      }
    } catch (error: any) {
      return { success: false, message: error.message || '取得失敗' }
    }
  }
}
