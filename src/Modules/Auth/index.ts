/**
 * Auth module public surface.
 *
 * Re-exports domain, application, infrastructure, and presentation types
 * to provide a clean public API for other modules.
 */

// Application DTOs
export type { LoginRequest, LoginResponse } from './Application/DTOs/LoginDTO'
export type { RegisterUserRequest, RegisterUserResponse } from './Application/DTOs/RegisterUserDTO'
export type {
  ListUsersQuery,
  ListUsersResponse,
  UserListItemDTO,
} from './Application/DTOs/UserListDTO'
export type {
  ChangeUserStatusRequest,
  ChangeUserStatusResponse,
} from './Application/DTOs/UserStatusDTO'

// Application Services
export { ChangeUserStatusService } from './Application/Services/ChangeUserStatusService'
export { GoogleOAuthService } from './Application/Services/GoogleOAuthService'
export { ListUsersService } from './Application/Services/ListUsersService'
export { LoginUserService } from './Application/Services/LoginUserService'
export { RegisterUserService } from './Application/Services/RegisterUserService'

// Domain
export type { UserProps } from './Domain/Aggregates/User'
export { User, UserStatus } from './Domain/Aggregates/User'
export type { IAuthRepository } from './Domain/Repositories/IAuthRepository'
export { AuthToken } from './Domain/ValueObjects/AuthToken'
export { Email } from './Domain/ValueObjects/Email'
export { Password } from './Domain/ValueObjects/Password'
export { Role, RoleType } from './Domain/ValueObjects/Role'

// Infrastructure
export { AuthServiceProvider } from './Infrastructure/Providers/AuthServiceProvider'
export { AuthRepository } from './Infrastructure/Repositories/AuthRepository'

// Presentation
export { AuthController } from './Presentation/Controllers/AuthController'
export { registerAuthRoutes } from './Presentation/Routes/auth.routes'
