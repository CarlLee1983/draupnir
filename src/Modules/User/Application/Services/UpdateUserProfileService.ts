import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import type { UpdateUserProfileRequest, UserProfileResponse } from '../DTOs/UserProfileDTO'
import { Phone } from '../../Domain/ValueObjects/Phone'
import { Timezone } from '../../Domain/ValueObjects/Timezone'
import { Locale } from '../../Domain/ValueObjects/Locale'

export class UpdateUserProfileService {
  constructor(private profileRepository: IUserProfileRepository) {}

  async execute(userId: string, request: UpdateUserProfileRequest): Promise<UserProfileResponse> {
    try {
      const profile = await this.profileRepository.findById(userId)
      if (!profile) {
        return { success: false, message: '找不到 Profile', error: 'PROFILE_NOT_FOUND' }
      }

      // 驗證選填欄位
      if (request.phone !== undefined && request.phone !== null) {
        new Phone(request.phone) // 驗證格式，無效會拋出例外
      }
      if (request.timezone !== undefined) {
        new Timezone(request.timezone)
      }
      if (request.locale !== undefined) {
        new Locale(request.locale)
      }

      const updated = profile.updateProfile(request)
      await this.profileRepository.update(updated)

      return { success: true, message: '更新成功', data: updated.toDTO() }
    } catch (error: any) {
      return { success: false, message: error.message || '更新失敗', error: error.message }
    }
  }
}
