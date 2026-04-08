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
import type { IUserProfileRepository } from '@/Modules/User/Domain/Repositories/IUserProfileRepository'
import { RegisterUserService } from '../../Application/Services/RegisterUserService'
import { LoginUserService } from '../../Application/Services/LoginUserService'
import { JwtTokenService } from '../../Application/Services/JwtTokenService'
import { RefreshTokenService } from '../../Application/Services/RefreshTokenService'
import { LogoutUserService } from '../../Application/Services/LogoutUserService'
import { AuthorizationService } from '../../Domain/Services/AuthorizationService'
import { AuthRepository } from '../Repositories/AuthRepository'
import { AuthTokenRepository } from '../Repositories/AuthTokenRepository'
import { getRegistry } from '@/wiring/RepositoryRegistry'
import { getCurrentORM } from '@/wiring/RepositoryFactory'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'

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

    // 2. 註冊 Domain Services
    container.singleton('authorizationService', () => {
      return new AuthorizationService()
    })

    // 3. 註冊 Application Services
    container.singleton('jwtTokenService', () => {
      return new JwtTokenService()
    })

    container.bind('registerUserService', (c: IContainer) => {
      const repository = c.make('authRepository') as IAuthRepository
      const profileRepo = c.make('userProfileRepository') as IUserProfileRepository
      return new RegisterUserService(repository, profileRepo)
    })

    container.bind('loginUserService', (c: IContainer) => {
      const authRepository = c.make('authRepository') as IAuthRepository
      const authTokenRepository = c.make('authTokenRepository') as IAuthTokenRepository
      const jwtTokenService = c.make('jwtTokenService')
      return new LoginUserService(authRepository, authTokenRepository, jwtTokenService)
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
  }

  /**
   * 啟動時執行初始化邏輯
   */
  override boot(_context: any): void {
    console.log('🔐 [Auth] Module loaded')
  }
}
