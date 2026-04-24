/**
 * GetProfileService
 * Application service: retrieves a user's detailed profile information.
 *
 * Responsibilities:
 * - Fetch user profile data from the repository using UID
 * - Ensure the profile exists before returning
 * - Map the domain aggregate to a DTO for presentation
 */

import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import type { UserProfileResponse } from '../DTOs/UserProfileDTO'
import { profileToDTO } from '../DTOs/UserProfileDTO'

/**
 * Service for retrieving a user profile.
 */
export class GetProfileService {
  constructor(private profileRepository: IUserProfileRepository) {}

  /**
   * Retrieves a user profile by ID.
   */
  async execute(userId: string): Promise<UserProfileResponse> {
    try {
      const profile = await this.profileRepository.findByUserId(userId)
      if (!profile) {
        return { success: false, message: 'Profile not found', error: 'PROFILE_NOT_FOUND' }
      }
      return { success: true, message: 'Profile retrieved', data: profileToDTO(profile) }
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    } catch (error: any) {
      return { success: false, message: error.message || 'Retrieval failed', error: error.message }
    }
  }
}
