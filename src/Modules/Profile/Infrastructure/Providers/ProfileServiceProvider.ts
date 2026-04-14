import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { GetProfileService } from '../../Application/Services/GetProfileService'
import { UpdateProfileService } from '../../Application/Services/UpdateProfileService'
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import { UserProfileRepository } from '../Repositories/UserProfileRepository'
import { ProfileController } from '../../Presentation/Controllers/ProfileController'
import { registerProfileRoutes } from '../../Presentation/Routes/profile.routes'

/**
 * Service Provider for the Profile Module.
 * Handles dependency injection registration for repositories and services.
 */
export class ProfileServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  /**
   * Registers dependencies in the container.
   * @param container - The application container.
   */
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('profileRepository', () => {
      return new UserProfileRepository(db)
    })

    container.bind('getProfileService', (c: IContainer) => {
      const repo = c.make('profileRepository') as IUserProfileRepository
      return new GetProfileService(repo)
    })

    container.bind('updateProfileService', (c: IContainer) => {
      const repo = c.make('profileRepository') as IUserProfileRepository
      return new UpdateProfileService(repo)
    })
  }

  registerRoutes(context: IRouteContext): void {
    const controller = new ProfileController(
      context.container.make('getProfileService') as any,
      context.container.make('updateProfileService') as any,
      context.container.make('listUsersService') as any,
      context.container.make('changeUserStatusService') as any,
    )
    registerProfileRoutes(context.router, controller)
  }

  /**
   * Boots the module.
   * @param _context - Application context.
   */
  override boot(_context: any): void {
    // Profile module loaded
  }
}
