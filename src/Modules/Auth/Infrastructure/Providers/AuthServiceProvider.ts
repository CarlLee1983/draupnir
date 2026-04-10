/**
 * AuthServiceProvider
 * Dependency injection wiring for the Auth module.
 *
 * Design:
 * - Resolve `IDatabaseAccess` inside `register()` via `getCurrentDatabaseAccess()` (no ctor injection).
 * - Single `AuthRepository` factory; concrete DB adapter is chosen by Shared wiring.
 */

import type { IUserProfileRepository } from '@/Modules/Profile/Domain/Repositories/IUserProfileRepository'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { getCurrentORM } from '@/wiring/RepositoryFactory'
import { getRegistry } from '@/wiring/RepositoryRegistry'
import { ChangeUserStatusService } from '../../Application/Services/ChangeUserStatusService'
import { GetUserDetailService } from '../../Application/Services/GetUserDetailService'
import { JwtTokenService } from '../Services/JwtTokenService'
import { ListUsersService } from '../../Application/Services/ListUsersService'
import { LoginUserService } from '../../Application/Services/LoginUserService'
import { LogoutUserService } from '../../Application/Services/LogoutUserService'
import { RefreshTokenService } from '../../Application/Services/RefreshTokenService'
import { RegisterUserService } from '../../Application/Services/RegisterUserService'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import { configureAuthMiddleware } from '../../Presentation/Middleware/RoleMiddleware'
import { AuthRepository } from '../Repositories/AuthRepository'
import { AuthTokenRepository } from '../Repositories/AuthTokenRepository'
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
      const profileRepo = c.make('profileRepository') as IUserProfileRepository
      const passwordHasher = c.make('passwordHasher') as ScryptPasswordHasher
      return new RegisterUserService(repository, profileRepo, passwordHasher)
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

    // Configure middleware with the registered token repository
    configureAuthMiddleware(container.make('authTokenRepository') as IAuthTokenRepository)
  }

  /**
   * Module boot hook. Executed after all providers are registered.
   * Useful for logging or one-time module initialization.
   */
  override boot(_context: any): void {
    console.log('🔐 [Auth] Module loaded')
  }
}
