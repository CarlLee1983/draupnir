import type { ChangeUserStatusService } from '@/Modules/Auth/Application/Services/ChangeUserStatusService'
import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { GetProfileService } from '../../Application/Services/GetProfileService'
import { UpdateProfileService } from '../../Application/Services/UpdateProfileService'
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import { ProfileController } from '../../Presentation/Controllers/ProfileController'
import { registerProfileRoutes } from '../../Presentation/Routes/profile.routes'
import { UserProfileRepository } from '../Repositories/UserProfileRepository'

export class ProfileServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    container.singleton(
      'profileRepository',
      () => new UserProfileRepository(getCurrentDatabaseAccess()),
    )
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind(
      'getProfileService',
      (c: IContainer) =>
        new GetProfileService(c.make('profileRepository') as IUserProfileRepository),
    )
    container.bind(
      'updateProfileService',
      (c: IContainer) =>
        new UpdateProfileService(c.make('profileRepository') as IUserProfileRepository),
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind(
      'profileController',
      (c: IContainer) =>
        new ProfileController(
          c.make('getProfileService') as GetProfileService,
          c.make('updateProfileService') as UpdateProfileService,
          c.make('listUsersService') as ListUsersService,
          c.make('changeUserStatusService') as ChangeUserStatusService,
        ),
    )
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('profileController') as ProfileController
    registerProfileRoutes(context.router, controller)
  }
}
