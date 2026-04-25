/**
 * AuthServiceProvider
 *
 * Infrastructure: `ModuleServiceProvider` for the Auth bounded context—repository and adapter
 * bindings, application services, HTTP controller, route registration, and boot-time side effects.
 *
 * Implementation notes:
 * - `authRepository` is resolved through the repository registry for ORM switching; other auth
 *   repositories use `getCurrentDatabaseAccess()` directly.
 * - First resolution of `emailService` in `production` without `EMAIL_TRANSPORT_CONFIGURED=true`
 *   throws `Error` (see `registerInfraServices`).
 */

import { UserRegisteredHandler } from '@/Modules/Profile/Application/EventHandlers/UserRegisteredHandler'
import type { IUserProfileRepository } from '@/Modules/Profile/Domain/Repositories/IUserProfileRepository'
import type { IClock } from '@/Shared/Application/Ports/IClock'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { getCurrentORM } from '@/wiring/RepositoryFactory'
import { getRegistry } from '@/wiring/RepositoryRegistry'
import type { IEmailService } from '../../Application/Ports/IEmailService'
import type { IGoogleOAuthAdapter } from '../../Application/Ports/IGoogleOAuthAdapter'
import { ChangePasswordService } from '../../Application/Services/ChangePasswordService'
import { ChangeUserStatusService } from '../../Application/Services/ChangeUserStatusService'
import { EmailVerificationService } from '../../Application/Services/EmailVerificationService'
import { ForgotPasswordService } from '../../Application/Services/ForgotPasswordService'
import { GetUserDetailService } from '../../Application/Services/GetUserDetailService'
import { GoogleOAuthService } from '../../Application/Services/GoogleOAuthService'
import { ListSessionsService } from '../../Application/Services/ListSessionsService'
import { ListUsersService } from '../../Application/Services/ListUsersService'
import { LoginUserService } from '../../Application/Services/LoginUserService'
import { LogoutUserService } from '../../Application/Services/LogoutUserService'
import { RefreshTokenService } from '../../Application/Services/RefreshTokenService'
import { RegisterUserService } from '../../Application/Services/RegisterUserService'
import { ResetPasswordService } from '../../Application/Services/ResetPasswordService'
import { RevokeAllSessionsService } from '../../Application/Services/RevokeAllSessionsService'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import type { IEmailVerificationRepository } from '../../Domain/Repositories/IEmailVerificationRepository'
import type { IPasswordResetRepository } from '../../Domain/Repositories/IPasswordResetRepository'
import { AuthController } from '../../Presentation/Controllers/AuthController'
import { configureAuthMiddleware } from '../../Presentation/Middleware/RoleMiddleware'
import { registerAuthRoutes } from '../../Presentation/Routes/auth.routes'
import { registerTestSeedRoutes } from '../../Presentation/Routes/test-seed.routes'
import { AuthRepository } from '../Repositories/AuthRepository'
import { AuthTokenRepository } from '../Repositories/AuthTokenRepository'
import { EmailVerificationRepository } from '../Repositories/EmailVerificationRepository'
import { PasswordResetRepository } from '../Repositories/PasswordResetRepository'
import { ConsoleEmailService } from '../Services/ConsoleEmailService'
import { GoogleOAuthAdapter } from '../Services/GoogleOAuthAdapter'
import { JwtTokenService } from '../Services/JwtTokenService'
import { ScryptPasswordHasher } from '../Services/PasswordHasher'

/**
 * Wires Auth into the shared container using the four `ModuleServiceProvider` phases, implements
 * `IRouteRegistrar`, and runs middleware/event setup in `boot`.
 */
export class AuthServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    const registry = getRegistry()
    registry.register(
      'auth',
      (_orm: string, _db: IDatabaseAccess | undefined) => new AuthRepository(db),
    )
    container.singleton('authRepository', () =>
      getRegistry().create('auth', getCurrentORM(), undefined),
    )
    container.singleton('authTokenRepository', () => new AuthTokenRepository(db))
    container.singleton('passwordResetRepository', () => new PasswordResetRepository(db))
    container.singleton('emailVerificationRepository', () => new EmailVerificationRepository(db))
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('passwordHasher', () => new ScryptPasswordHasher())
    container.singleton(
      'jwtTokenService',
      (c: IContainer) => new JwtTokenService(c.make('clock') as IClock),
    )
    container.singleton(
      'googleOAuthAdapter',
      () =>
        new GoogleOAuthAdapter(
          process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
          process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
          process.env.GOOGLE_OAUTH_REDIRECT_URI ?? 'http://localhost:3000/oauth/google/callback',
        ),
    )
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
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind(
      'registerUserService',
      (c: IContainer) =>
        new RegisterUserService(
          c.make('authRepository') as IAuthRepository,
          c.make('passwordHasher') as ScryptPasswordHasher,
        ),
    )
    container.bind(
      'loginUserService',
      (c: IContainer) =>
        new LoginUserService(
          c.make('authRepository') as IAuthRepository,
          c.make('authTokenRepository') as IAuthTokenRepository,
          c.make('jwtTokenService') as JwtTokenService,
          c.make('passwordHasher') as ScryptPasswordHasher,
        ),
    )
    container.bind(
      'refreshTokenService',
      (c: IContainer) =>
        new RefreshTokenService(
          c.make('authRepository') as IAuthRepository,
          c.make('authTokenRepository') as IAuthTokenRepository,
          c.make('jwtTokenService') as JwtTokenService,
        ),
    )
    container.bind(
      'logoutUserService',
      (c: IContainer) =>
        new LogoutUserService(c.make('authTokenRepository') as IAuthTokenRepository),
    )
    container.bind(
      'listSessionsService',
      (c: IContainer) =>
        new ListSessionsService(c.make('authTokenRepository') as IAuthTokenRepository),
    )
    container.bind(
      'revokeAllSessionsService',
      (c: IContainer) =>
        new RevokeAllSessionsService(c.make('authTokenRepository') as IAuthTokenRepository),
    )
    container.bind(
      'changeUserStatusService',
      (c: IContainer) =>
        new ChangeUserStatusService(
          c.make('authRepository') as IAuthRepository,
          c.make('authTokenRepository') as IAuthTokenRepository,
        ),
    )
    container.bind(
      'listUsersService',
      (c: IContainer) =>
        new ListUsersService(
          c.make('authRepository') as IAuthRepository,
          c.make('profileRepository') as IUserProfileRepository,
        ),
    )
    container.bind(
      'getUserDetailService',
      (c: IContainer) => new GetUserDetailService(c.make('authRepository') as IAuthRepository),
    )
    container.bind(
      'googleOAuthService',
      (c: IContainer) =>
        new GoogleOAuthService(
          c.make('authRepository') as IAuthRepository,
          c.make('jwtTokenService') as JwtTokenService,
          c.make('googleOAuthAdapter') as IGoogleOAuthAdapter,
          c.make('profileRepository') as IUserProfileRepository,
          c.make('passwordHasher') as ScryptPasswordHasher,
        ),
    )
    container.bind(
      'forgotPasswordService',
      (c: IContainer) =>
        new ForgotPasswordService(
          c.make('authRepository') as IAuthRepository,
          c.make('passwordResetRepository') as IPasswordResetRepository,
          c.make('emailService') as IEmailService,
          process.env.APP_URL?.trim() || 'http://localhost:3000',
        ),
    )
    container.bind(
      'resetPasswordService',
      (c: IContainer) =>
        new ResetPasswordService(
          c.make('passwordResetRepository') as IPasswordResetRepository,
          c.make('authRepository') as IAuthRepository,
          c.make('passwordHasher') as ScryptPasswordHasher,
          c.make('authTokenRepository') as IAuthTokenRepository,
        ),
    )
    container.bind(
      'changePasswordService',
      (c: IContainer) =>
        new ChangePasswordService(
          c.make('authRepository') as IAuthRepository,
          c.make('passwordHasher') as ScryptPasswordHasher,
          c.make('authTokenRepository') as IAuthTokenRepository,
        ),
    )
    container.bind(
      'emailVerificationService',
      (c: IContainer) =>
        new EmailVerificationService(
          c.make('emailVerificationRepository') as IEmailVerificationRepository,
        ),
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind(
      'authController',
      (c: IContainer) =>
        new AuthController(
          c.make('registerUserService') as RegisterUserService,
          c.make('loginUserService') as LoginUserService,
          c.make('refreshTokenService') as RefreshTokenService,
          c.make('logoutUserService') as LogoutUserService,
          c.make('listSessionsService') as ListSessionsService,
          c.make('revokeAllSessionsService') as RevokeAllSessionsService,
        ),
    )
  }

  /**
   * Mounts auth HTTP routes on `context.router`; when the current ORM is `memory`, also registers
   * test seed routes (local/dev convenience only).
   *
   * @param context - Framework route context (router + container).
   */
  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('authController') as AuthController
    void registerAuthRoutes(context.router, controller)
    if (getCurrentORM() === 'memory') {
      registerTestSeedRoutes(context.router, getCurrentDatabaseAccess())
    }
  }

  /**
   * Side effects at startup: configures auth/role middleware (token revocation checks) and
   * subscribes to `auth.user_registered` so `UserRegisteredHandler` can create profile rows.
   */
  override boot(container: IContainer): void {
    // Middleware 初始化（passing container-bound jwtTokenService so verification respects DI clock）
    configureAuthMiddleware(
      container.make('authTokenRepository') as IAuthTokenRepository,
      container.make(
        'jwtTokenService',
      ) as import('../../Application/Ports/IJwtTokenService').IJwtTokenService,
    )

    // Event 訂閱
    const profileRepo = container.make('profileRepository') as IUserProfileRepository
    DomainEventDispatcher.getInstance().on('auth.user_registered', async (event) => {
      await new UserRegisteredHandler(profileRepo).execute(
        event.data.userId as string,
        event.data.email as string,
      )
    })
    console.log('🔐 [Auth] Module loaded')
  }
}
