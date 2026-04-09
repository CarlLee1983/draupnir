/**
 * AuthServiceProvider
 * Auth 模組的服務提供者（依賴注入）
 *
 * 設計原則：
 * - 需 IDatabaseAccess 時在 register() 內透過 getCurrentDatabaseAccess() 取得，無需建構子注入
 * - 單一 AuthRepository，實作由 Shared 的 DatabaseAccessBuilder / 適配器指定
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import type { IUserProfileRepository } from '@/Modules/Profile/Domain/Repositories/IUserProfileRepository'
import { RegisterUserService } from '../../Application/Services/RegisterUserService'
import { LoginUserService } from '../../Application/Services/LoginUserService'
import { JwtTokenService } from '../../Application/Services/JwtTokenService'
import { RefreshTokenService } from '../../Application/Services/RefreshTokenService'
import { LogoutUserService } from '../../Application/Services/LogoutUserService'
import { ChangeUserStatusService } from '../../Application/Services/ChangeUserStatusService'
import { ListUsersService } from '../../Application/Services/ListUsersService'
import { AuthRepository } from '../Repositories/AuthRepository'
import { AuthTokenRepository } from '../Repositories/AuthTokenRepository'
import { ScryptPasswordHasher } from '../Services/PasswordHasher'
import { getRegistry } from '@/wiring/RepositoryRegistry'
import { getCurrentORM } from '@/wiring/RepositoryFactory'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { configureAuthMiddleware } from '../../Presentation/Middleware/RoleMiddleware'

export class AuthServiceProvider extends ModuleServiceProvider {
  /**
   * 註冊本模組 Repository 工廠到 Registry，並註冊服務到容器
   * IDatabaseAccess 透過 getCurrentDatabaseAccess() 取得，無需建構子參數
   */
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    const registry = getRegistry()
    registry.register('auth', (_orm: string, _db: IDatabaseAccess | undefined) => {
      return new AuthRepository(db)
    })

    container.singleton('authRepository', () => {
      return getRegistry().create('auth', getCurrentORM(), undefined)
    })

    // 註冊 AuthTokenRepository
    container.singleton('authTokenRepository', () => {
      return new AuthTokenRepository(db)
    })

    container.singleton('passwordHasher', () => {
      return new ScryptPasswordHasher()
    })

    // 2. 註冊 Application Services
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
      return new LoginUserService(authRepository, authTokenRepository, jwtTokenService, passwordHasher)
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

    configureAuthMiddleware(container.make('authTokenRepository') as IAuthTokenRepository)
  }

  /**
   * 啟動時執行初始化邏輯
   */
  override boot(_context: any): void {
    console.log('🔐 [Auth] Module loaded')
  }
}
