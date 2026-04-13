/**
 * GoogleOAuthService — exchanges OAuth authorization codes for JWT access tokens.
 */

import { UserProfile } from '@/Modules/Profile/Domain/Aggregates/UserProfile'
import type { IUserProfileRepository } from '@/Modules/Profile/Domain/Repositories/IUserProfileRepository'
import { User, UserStatus } from '../../Domain/Aggregates/User'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import { Email } from '../../Domain/ValueObjects/Email'
import { Password } from '../../Domain/ValueObjects/Password'
import { Role } from '../../Domain/ValueObjects/Role'
import type { GoogleOAuthAdapter } from '../../Infrastructure/Services/GoogleOAuthAdapter'
import type { IJwtTokenService } from '../Ports/IJwtTokenService'
import type { IPasswordHasher } from '../Ports/IPasswordHasher'

export class GoogleOAuthService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly jwtTokenService: IJwtTokenService,
    private readonly googleOAuthAdapter: GoogleOAuthAdapter,
    private readonly userProfileRepository: IUserProfileRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async exchange(code: string): Promise<{
    success: boolean
    jwt?: string
    userId?: string
    error?: string
  }> {
    try {
      const accessToken = await this.googleOAuthAdapter.exchangeCodeForToken(code)
      const googleUserInfo = await this.googleOAuthAdapter.getUserInfo(accessToken)

      let user = await this.authRepository.findByGoogleId(googleUserInfo.id)

      if (user) {
        return this.issueSuccess(user)
      }

      const email = new Email(googleUserInfo.email)
      user = await this.authRepository.findByEmail(email)

      if (user) {
        if (user.googleId && user.googleId !== googleUserInfo.id) {
          return { success: false, error: 'OAUTH_ACCOUNT_CONFLICT' }
        }
        if (!user.googleId) {
          user.linkGoogleAccount(googleUserInfo.id)
          await this.authRepository.save(user)
        }
        return this.issueSuccess(user)
      }

      const userId = crypto.randomUUID()
      const hashedPassword = await this.passwordHasher.hash(crypto.randomUUID())
      const newUser = User.create(
        userId,
        email,
        Password.fromHashed(hashedPassword),
        Role.member(),
        UserStatus.ACTIVE,
        new Date(),
        new Date(),
        googleUserInfo.id,
      )
      await this.authRepository.save(newUser)

      try {
        const profile = UserProfile.createDefault(newUser.id, googleUserInfo.email)
        await this.userProfileRepository.save(profile)
      } catch (profileError) {
        await this.authRepository.delete(newUser.id)
        throw profileError
      }

      return this.issueSuccess(newUser)
    } catch {
      return {
        success: false,
        error: 'OAUTH_ERROR',
      }
    }
  }

  private issueSuccess(user: User): { success: true; jwt: string; userId: string } {
    const access = this.jwtTokenService.signAccessToken({
      userId: user.id,
      email: user.emailValue,
      role: user.role.getValue(),
      permissions: [],
    })
    return {
      success: true,
      jwt: access.getValue(),
      userId: user.id,
    }
  }
}
