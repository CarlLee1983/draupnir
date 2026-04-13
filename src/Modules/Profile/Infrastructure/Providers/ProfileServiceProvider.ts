import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { GetProfileService } from '../../Application/Services/GetProfileService'
import { UpdateProfileService } from '../../Application/Services/UpdateProfileService'
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import { UserProfileRepository } from '../Repositories/UserProfileRepository'

/**
 * Service Provider for the Profile Module.
 * Handles dependency injection registration for repositories and services.
 */
export class ProfileServiceProvider extends ModuleServiceProvider {
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

  /**
   * Boots the module.
   * @param _context - Application context.
   */
  override boot(_context: any): void {
    console.log('👤 [Profile] Module loaded')
  }
}
