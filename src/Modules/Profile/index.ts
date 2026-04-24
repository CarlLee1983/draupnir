/**
 * Profile module public surface.
 *
 * Manages user identities, personal preferences, and profile metadata
 * including localization and notification settings.
 */

// Application
export type {
  UpdateUserProfileRequest,
  UserProfileResponse,
} from './Application/DTOs/UserProfileDTO'
export { UserRegisteredHandler } from './Application/EventHandlers/UserRegisteredHandler'
export { GetProfileService } from './Application/Services/GetProfileService'
export { UpdateProfileService } from './Application/Services/UpdateProfileService'
export type { UpdateProfileFields } from './Domain/Aggregates/UserProfile'
export { UserProfile } from './Domain/Aggregates/UserProfile'
export { UserProfileCreated } from './Domain/Events/UserProfileCreated'
export { UserProfileUpdated } from './Domain/Events/UserProfileUpdated'
export type {
  IUserProfileRepository,
  UserProfileFilters,
} from './Domain/Repositories/IUserProfileRepository'
export { Locale } from './Domain/ValueObjects/Locale'
export { Phone } from './Domain/ValueObjects/Phone'
export { Timezone } from './Domain/ValueObjects/Timezone'
export { ProfileServiceProvider } from './Infrastructure/Providers/ProfileServiceProvider'
// Infrastructure
export { UserProfileRepository } from './Infrastructure/Repositories/UserProfileRepository'

// Presentation
export { ProfileController } from './Presentation/Controllers/ProfileController'
export { registerProfileRoutes } from './Presentation/Routes/profile.routes'
