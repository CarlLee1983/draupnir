/**
 * UpdateProfileService
 * Application service: handles updates to a user's personal profile information.
 *
 * Responsibilities:
 * - Retrieve the current user profile from the repository using userId
 * - Apply changes to the domain aggregate (VO validation occurs inside updateProfile)
 * - Persist the updated aggregate back to storage
 * - Dispatch domain events collected during aggregate mutation
 */

import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import { profileToDTO } from '../DTOs/UserProfileDTO'
import type { UpdateUserProfileRequest, UserProfileResponse } from '../DTOs/UserProfileDTO'

/**
 * Service for updating a user profile.
 */
export class UpdateProfileService {
  constructor(private profileRepository: IUserProfileRepository) {}

  /**
   * Updates a user profile with the provided data.
   * @param userId - Auth user ID of the user whose profile is being updated.
   * @param request - The update payload containing optional fields.
   * @returns UserProfileResponse indicating success or failure.
   */
  async execute(userId: string, request: UpdateUserProfileRequest): Promise<UserProfileResponse> {
    try {
      const profile = await this.profileRepository.findByUserId(userId)
      if (!profile) {
        return { success: false, message: 'Profile not found', error: 'PROFILE_NOT_FOUND' }
      }

      const updated = profile.updateProfile(request)
      await this.profileRepository.update(updated)

      // Dispatch domain events collected during aggregate mutation
      const dispatcher = DomainEventDispatcher.getInstance()
      await dispatcher.dispatchAll(updated.domainEvents)

      return { success: true, message: 'Update successful', data: profileToDTO(updated) }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Update failed',
        error: error.message,
      }
    }
  }
}
