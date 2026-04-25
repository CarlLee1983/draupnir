import type { ChangeUserStatusService } from '@/Modules/Auth/Application/Services/ChangeUserStatusService'
import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { GetProfileService } from '../../Application/Services/GetProfileService'
import { UpdateProfileService } from '../../Application/Services/UpdateProfileService'
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import { ProfileController } from '../../Presentation/Controllers/ProfileController'
import { UserProfileAuditLogHandler } from '../../Application/EventHandlers/UserProfileAuditLogHandler'
import type { IActivityLogRepository } from '@/Shared/Domain/Repositories/IActivityLogRepository'
import { UserProfileUpdateNotificationHandler } from '../../Application/EventHandlers/UserProfileUpdateNotificationHandler'
import type { UserProfileUpdated } from '../../Domain/Events/UserProfileUpdated'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/IMailer'
import { registerProfileRoutes } from '../../Presentation/Routes/profile.routes'
import { UserProfileRepository } from '../Repositories/UserProfileRepository'

export class ProfileServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  public override boot(container: IContainer): void {
    const dispatcher = DomainEventDispatcher.getInstance()

    // 1. Audit Log Consumer (Technical/Traceability)
    dispatcher.on('profile.user_profile_updated', async (event) => {
      const repo = container.make('activityLogRepository') as IActivityLogRepository
      await new UserProfileAuditLogHandler(repo).execute(event as UserProfileUpdated)
    })

    // 2. Security Notification Consumer (Business/Security)
    dispatcher.on('profile.user_profile_updated', async (event) => {
      const mailer = container.make('mailer') as IMailer
      await new UserProfileUpdateNotificationHandler(mailer).execute(event as UserProfileUpdated)
    })
  }

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
