import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import type { UserProfileResponse } from '../DTOs/UserProfileDTO'

export class GetUserProfileService {
  constructor(private profileRepository: IUserProfileRepository) {}

  async execute(userId: string): Promise<UserProfileResponse> {
    try {
      const profile = await this.profileRepository.findById(userId)
      if (!profile) {
        return { success: false, message: '找不到 Profile', error: 'PROFILE_NOT_FOUND' }
      }
      return { success: true, message: '取得成功', data: profile.toDTO() }
    } catch (error: any) {
      return { success: false, message: error.message || '取得失敗', error: error.message }
    }
  }
}
