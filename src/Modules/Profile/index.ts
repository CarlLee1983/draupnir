// src/Modules/Profile/index.ts
// Domain
export { UserProfile } from './Domain/Aggregates/UserProfile'
export type { UpdateProfileFields } from './Domain/Aggregates/UserProfile'
export { Phone } from './Domain/ValueObjects/Phone'
export { Timezone } from './Domain/ValueObjects/Timezone'
export { Locale } from './Domain/ValueObjects/Locale'
export type { IUserProfileRepository, UserProfileFilters } from './Domain/Repositories/IUserProfileRepository'

// Application
export type { UpdateUserProfileRequest, UserProfileResponse } from './Application/DTOs/UserProfileDTO'
export { GetProfileService } from './Application/Services/GetProfileService'
export { UpdateProfileService } from './Application/Services/UpdateProfileService'

// Infrastructure
export { UserProfileRepository } from './Infrastructure/Repositories/UserProfileRepository'
export { ProfileServiceProvider } from './Infrastructure/Providers/ProfileServiceProvider'

// Presentation
export { ProfileController } from './Presentation/Controllers/ProfileController'
export { registerProfileRoutes } from './Presentation/Routes/profile.routes'
