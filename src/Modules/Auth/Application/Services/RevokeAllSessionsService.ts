import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'

export type RevokeAllSessionsResult =
  | { success: true; message: string }
  | { success: false; message: string; error?: string }

/**
 * Revokes every active token for the user (all devices). Same persistence rule as {@link LogoutUserService.logoutAllDevices}.
 */
export class RevokeAllSessionsService {
  constructor(private readonly authTokenRepository: IAuthTokenRepository) {}

  async execute(userId: string): Promise<RevokeAllSessionsResult> {
    try {
      await this.authTokenRepository.revokeAllByUserId(userId)
      return { success: true, message: 'Logged out from all devices' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Logout failed'
      return { success: false, message, error: message }
    }
  }
}
