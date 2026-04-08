// src/Modules/User/index.ts
// Domain
export { UserProfile } from './Domain/Aggregates/UserProfile'
export type { UpdateProfileFields } from './Domain/Aggregates/UserProfile'
export { Phone } from './Domain/ValueObjects/Phone'
export { Timezone } from './Domain/ValueObjects/Timezone'
export { Locale } from './Domain/ValueObjects/Locale'
export type { IUserProfileRepository, UserProfileFilters } from './Domain/Repositories/IUserProfileRepository'

// Application
export type { UpdateUserProfileRequest, UserProfileResponse, ListUsersRequest, ListUsersResponse, ChangeUserStatusRequest } from './Application/DTOs/UserProfileDTO'
export { GetUserProfileService } from './Application/Services/GetUserProfileService'
export { UpdateUserProfileService } from './Application/Services/UpdateUserProfileService'
export { ListUsersService } from './Application/Services/ListUsersService'
export { ChangeUserStatusService } from './Application/Services/ChangeUserStatusService'

// Infrastructure
export { UserProfileRepository } from './Infrastructure/Repositories/UserProfileRepository'
export { UserServiceProvider } from './Infrastructure/Providers/UserServiceProvider'

// Presentation
export { UserController } from './Presentation/Controllers/UserController'
export { registerUserRoutes } from './Presentation/Routes/user.routes'
