/**
 * AuthServiceProvider
 * Dependency injection wiring for the Auth module.
 *
 * Design:
 * - Resolve `IDatabaseAccess` inside `register()` via `getCurrentDatabaseAccess()` (no ctor injection).
 * - Single `AuthRepository` factory; concrete DB adapter is chosen by Shared wiring.
 */

import type { IUserProfileRepository } from '@/Modules/Profile/Domain/Repositories/IUserProfileRepository'
import { UserRegisteredHandler } from '@/Modules/Profile/Application/Services/UserRegisteredHandler'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { getCurrentORM } from '@/wiring/RepositoryFactory'
import { getRegistry } from '@/wiring/RepositoryRegistry'
import type { IEmailService } from '../../Application/Ports/IEmailService'
import type { IGoogleOAuthAdapter } from '../../Application/Ports/IGoogleOAuthAdapter'
import { ChangeUserStatusService } from '../../Application/Services/ChangeUserStatusService'
import { EmailVerificationService } from '../../Application/Services/EmailVerificationService'
import { ForgotPasswordService } from '../../Application/Services/ForgotPasswordService'
import { GetUserDetailService } from '../../Application/Services/GetUserDetailService'
import { GoogleOAuthService } from '../../Application/Services/GoogleOAuthService'
import { ListUsersService } from '../../Application/Services/ListUsersService'
import { LoginUserService } from '../../Application/Services/LoginUserService'
import { LogoutUserService } from '../../Application/Services/LogoutUserService'
import { RefreshTokenService } from '../../Application/Services/RefreshTokenService'
import { RegisterUserService } from '../../Application/Services/RegisterUserService'
import { ResetPasswordService } from '../../Application/Services/ResetPasswordService'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import type { IEmailVerificationRepository } from '../../Domain/Repositories/IEmailVerificationRepository'
import type { IPasswordResetRepository } from '../../Domain/Repositories/IPasswordResetRepository'
import { configureAuthMiddleware } from '../../Presentation/Middleware/RoleMiddleware'
import { AuthRepository } from '../Repositories/AuthRepository'
import { AuthTokenRepository } from '../Repositories/AuthTokenRepository'
import { InMemoryEmailVerificationRepository } from '../Repositories/InMemoryEmailVerificationRepository'
import { InMemoryPasswordResetRepository } from '../Repositories/InMemoryPasswordResetRepository'
import { ConsoleEmailService } from '../Services/ConsoleEmailService'
import { GoogleOAuthAdapter } from '../Services/GoogleOAuthAdapter'
import { JwtTokenService } from '../Services/JwtTokenService'
import { ScryptPasswordHasher } from '../Services/PasswordHasher'

/**
 * Service provider for the Auth module.
 * Handles registration of repositories and application services into the DI container.
 */
export class AuthServiceProvider extends ModuleServiceProvider {
  /**
   * Registers repository factories and Auth services on the container.
   * Database access comes from `getCurrentDatabaseAccess()`.
   *
   * @param container The dependency injection container.
   */
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    const registry = getRegistry()

    // Register AuthRepository factory
    registry.register('auth', (_orm: string, _db: IDatabaseAccess | undefined) => {
      return new AuthRepository(db)
    })

    // Register AuthRepository as a singleton in the container
    container.singleton('authRepository', () => {
      return getRegistry().create('auth', getCurrentORM(), undefined)
    })

    // Register AuthTokenRepository as a singleton
    container.singleton('authTokenRepository', () => {
      return new AuthTokenRepository(db)
    })

    // Register PasswordHasher as a singleton
    container.singleton('passwordHasher', () => {
      return new ScryptPasswordHasher()
    })

    // 2. Register Application Services as singletons or bindings

    container.singleton('jwtTokenService', () => {
      return new JwtTokenService()
    })

    container.bind('registerUserService', (c: IContainer) => {
      const repository = c.make('authRepository') as IAuthRepository
      const passwordHasher = c.make('passwordHasher') as ScryptPasswordHasher
      return new RegisterUserService(repository, passwordHasher)
    })

    container.bind('loginUserService', (c: IContainer) => {
      const authRepository = c.make('authRepository') as IAuthRepository
      const authTokenRepository = c.make('authTokenRepository') as IAuthTokenRepository
      const jwtTokenService = c.make('jwtTokenService')
      const passwordHasher = c.make('passwordHasher') as ScryptPasswordHasher
      return new LoginUserService(
        authRepository,
        authTokenRepository,
        jwtTokenService,
        passwordHasher,
      )
    })

    container.bind('refreshTokenService', (c: IContainer) => {
      const authRepository = c.make('authRepository') as IAuthRepository
      const authTokenRepository = c.make('authTokenRepository') as IAuthTokenRepository
      const jwtTokenService = c.make('jwtTokenService')
      return new RefreshTokenService(authRepository, authTokenRepository, jwtTokenService)
    })

    container.bind('logoutUserService', (c: IContainer) => {
      const authTokenRepository = c.make('authTokenRepository') as IAuthTokenRepository
      return new LogoutUserService(authTokenRepository)
    })

    container.bind('changeUserStatusService', (c: IContainer) => {
      const authRepository = c.make('authRepository') as IAuthRepository
      const authTokenRepository = c.make('authTokenRepository') as IAuthTokenRepository
      return new ChangeUserStatusService(authRepository, authTokenRepository)
    })

    container.bind('listUsersService', (c: IContainer) => {
      const authRepository = c.make('authRepository') as IAuthRepository
      const profileRepo = c.make('profileRepository') as IUserProfileRepository
      return new ListUsersService(authRepository, profileRepo)
    })

    container.bind('getUserDetailService', (c: IContainer) => {
      const authRepository = c.make('authRepository') as IAuthRepository
      return new GetUserDetailService(authRepository)
    })

    container.singleton('googleOAuthAdapter', () => {
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? ''
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? ''
      const redirectUri =
        process.env.GOOGLE_OAUTH_REDIRECT_URI ?? 'http://localhost:3000/oauth/google/callback'
      return new GoogleOAuthAdapter(clientId, clientSecret, redirectUri)
    })

    container.bind('googleOAuthService', (c: IContainer) => {
      return new GoogleOAuthService(
        c.make('authRepository') as IAuthRepository,
        c.make('jwtTokenService') as JwtTokenService,
        c.make('googleOAuthAdapter') as IGoogleOAuthAdapter,
        c.make('profileRepository') as IUserProfileRepository,
        c.make('passwordHasher') as ScryptPasswordHasher,
      )
    })

    container.singleton('emailService', (): IEmailService => {
      if (
        process.env.NODE_ENV === 'production' &&
        process.env.EMAIL_TRANSPORT_CONFIGURED !== 'true'
      ) {
        throw new Error(
          '[Auth] Production email transport not configured. ' +
            'Set EMAIL_TRANSPORT_CONFIGURED=true and wire a real IEmailService binding, ' +
            'or replace ConsoleEmailService in AuthServiceProvider.',
        )
      }
      return new ConsoleEmailService()
    })

    container.singleton('passwordResetRepository', () => new InMemoryPasswordResetRepository())

    container.singleton(
      'emailVerificationRepository',
      () => new InMemoryEmailVerificationRepository(),
    )

    container.bind('forgotPasswordService', (c: IContainer) => {
      const baseUrl = process.env.APP_URL?.trim() || 'http://localhost:3000'
      return new ForgotPasswordService(
        c.make('authRepository') as IAuthRepository,
        c.make('passwordResetRepository') as IPasswordResetRepository,
        c.make('emailService') as IEmailService,
        baseUrl,
      )
    })

    container.bind('resetPasswordService', (c: IContainer) => {
      return new ResetPasswordService(
        c.make('passwordResetRepository') as IPasswordResetRepository,
        c.make('authRepository') as IAuthRepository,
        c.make('passwordHasher') as ScryptPasswordHasher,
        c.make('authTokenRepository') as IAuthTokenRepository,
      )
    })

    container.bind('emailVerificationService', (c: IContainer) => {
      return new EmailVerificationService(
        c.make('emailVerificationRepository') as IEmailVerificationRepository,
      )
    })

    // Configure middleware with the registered token repository
    configureAuthMiddleware(container.make('authTokenRepository') as IAuthTokenRepository)
  }

  /**
   * Module boot hook. Executed after all providers are registered.
   * Wires the UserRegisteredHandler to the DomainEventDispatcher so the Profile
   * module creates a default profile when a user successfully registers.
   */
  override boot(context: any): void {
    const container: IContainer = context
    const profileRepo = container.make('profileRepository') as IUserProfileRepository
    const handler = new UserRegisteredHandler(profileRepo)
    const dispatcher = DomainEventDispatcher.getInstance()
    dispatcher.on('auth.user_registered', async (event) => {
      await handler.execute(
        event.data.userId as string,
        event.data.email as string,
      )
    })
    console.log('🔐 [Auth] Module loaded')
  }
}
