/**
 * UpdateProfileService
 * Application service: handles updates to a user's personal profile information.
 *
 * Responsibilities:
 * - Retrieve the current user profile from the repository
 * - Validate optional field formats (phone, timezone, locale)
 * - Apply changes to the domain aggregate
 * - Persist the updated aggregate back to storage
 */

import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import type { UpdateUserProfileRequest, UserProfileResponse } from '../DTOs/UserProfileDTO'
import { Phone } from '../../Domain/ValueObjects/Phone'
import { Timezone } from '../../Domain/ValueObjects/Timezone'
import { Locale } from '../../Domain/ValueObjects/Locale'
import { UserProfileMapper } from '../../Infrastructure/Mappers/UserProfileMapper'

/**
 * Service for updating a user profile.
 */
export class UpdateProfileService {
  constructor(private profileRepository: IUserProfileRepository) {}

  /**
   * Updates a user profile with the provided data.
   * @param userId - ID of the user whose profile is being updated.
   * @param request - The update payload containing optional fields.
   * @returns UserProfileResponse indicating success or failure.
   */
  async execute(userId: string, request: UpdateUserProfileRequest): Promise<UserProfileResponse> {
    try {
      const profile = await this.profileRepository.findById(userId)
      if (!profile) {
        return { success: false, message: 'Profile not found', error: 'PROFILE_NOT_FOUND' }
      }

      // Validate optional fields
      if (request.phone !== undefined && request.phone !== null) {
        new Phone(request.phone) // Validation logic; throws if invalid
      }
      if (request.timezone !== undefined) {
        new Timezone(request.timezone)
      }
      if (request.locale !== undefined) {
        new Locale(request.locale)
      }

      const updated = profile.updateProfile(request)
      await this.profileRepository.update(updated)

      return { success: true, message: 'Update successful', data: UserProfileMapper.toDTO(updated) }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Update failed',
        error: error.message,
      }
    }
  }
}


