/**
 * Auth 模組入口點
 *
 * 導出所有公開的 API
 */

// Domain
export { User, UserRole, UserStatus } from './Domain/Aggregates/User'
export type { UserProps } from './Domain/Aggregates/User'
export { Email } from './Domain/ValueObjects/Email'
export { Password } from './Domain/ValueObjects/Password'
export { AuthToken } from './Domain/ValueObjects/AuthToken'
export type { IAuthRepository } from './Domain/Repositories/IAuthRepository'

// Application
export type { RegisterUserRequest, RegisterUserResponse } from './Application/DTOs/RegisterUserDTO'
export type { LoginRequest, LoginResponse } from './Application/DTOs/LoginDTO'
export { RegisterUserService } from './Application/Services/RegisterUserService'
export { LoginUserService } from './Application/Services/LoginUserService'

// Infrastructure（單一 AuthRepository，實作由上層 IDatabaseAccess 指定）
export { AuthRepository } from './Infrastructure/Repositories/AuthRepository'
export { AuthServiceProvider } from './Infrastructure/Providers/AuthServiceProvider'

// Presentation
export { AuthController } from './Presentation/Controllers/AuthController'
export { registerAuthRoutes } from './Presentation/Routes/auth.routes'
