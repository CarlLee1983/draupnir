import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { ProvisionOrganizationDefaultsService } from '@/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService'
import type { IJwtTokenService } from '@/Modules/Auth/Application/Ports/IJwtTokenService'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import type { IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { AcceptInvitationByIdService } from '../../Application/Services/AcceptInvitationByIdService'
import { AcceptInvitationService } from '../../Application/Services/AcceptInvitationService'
import { CancelInvitationService } from '../../Application/Services/CancelInvitationService'
import { ChangeOrgMemberRoleService } from '../../Application/Services/ChangeOrgMemberRoleService'
import { ChangeOrgStatusService } from '../../Application/Services/ChangeOrgStatusService'
import { CreateOrganizationService } from '../../Application/Services/CreateOrganizationService'
import { DeclineInvitationService } from '../../Application/Services/DeclineInvitationService'
import { GetOrganizationService } from '../../Application/Services/GetOrganizationService'
import { GetPendingInvitationsService } from '../../Application/Services/GetPendingInvitationsService'
import { GetUserMembershipService } from '../../Application/Services/GetUserMembershipService'
import { InviteMemberService } from '../../Application/Services/InviteMemberService'
import { ListInvitationsService } from '../../Application/Services/ListInvitationsService'
import { ListMembersService } from '../../Application/Services/ListMembersService'
import { ListOrganizationsService } from '../../Application/Services/ListOrganizationsService'
import { OrgAuthorizationHelper } from '../../Application/Services/OrgAuthorizationHelper'
import { RemoveMemberService } from '../../Application/Services/RemoveMemberService'
import { UpdateOrganizationService } from '../../Application/Services/UpdateOrganizationService'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import { OrganizationController } from '../../Presentation/Controllers/OrganizationController'
import { registerOrganizationRoutes } from '../../Presentation/Routes/organization.routes'
import { OrganizationInvitationRepository } from '../Repositories/OrganizationInvitationRepository'
import { OrganizationMemberRepository } from '../Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '../Repositories/OrganizationRepository'

export class OrganizationServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.singleton('organizationRepository', () => new OrganizationRepository(db))
    container.singleton('organizationMemberRepository', () => new OrganizationMemberRepository(db))
    container.singleton(
      'organizationInvitationRepository',
      () => new OrganizationInvitationRepository(db),
    )
  }

  protected override registerApplicationServices(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.singleton(
      'orgAuthorizationHelper',
      (c: IContainer) =>
        new OrgAuthorizationHelper(
          c.make('organizationMemberRepository') as IOrganizationMemberRepository,
        ),
    )
    container.bind(
      'createOrganizationService',
      (c: IContainer) =>
        new CreateOrganizationService(
          c.make('organizationRepository') as IOrganizationRepository,
          c.make('organizationMemberRepository') as IOrganizationMemberRepository,
          c.make('authRepository') as IAuthRepository,
          db as IDatabaseAccess,
          c.make('provisionOrganizationDefaultsService') as ProvisionOrganizationDefaultsService,
        ),
    )
    container.bind(
      'updateOrganizationService',
      (c: IContainer) =>
        new UpdateOrganizationService(
          c.make('organizationRepository') as IOrganizationRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        ),
    )
    container.bind(
      'listOrganizationsService',
      (c: IContainer) =>
        new ListOrganizationsService(c.make('organizationRepository') as IOrganizationRepository),
    )
    container.bind(
      'getOrganizationService',
      (c: IContainer) =>
        new GetOrganizationService(
          c.make('organizationRepository') as IOrganizationRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        ),
    )
    container.bind(
      'changeOrgStatusService',
      (c: IContainer) =>
        new ChangeOrgStatusService(
          c.make('organizationRepository') as IOrganizationRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        ),
    )
    container.bind(
      'inviteMemberService',
      (c: IContainer) =>
        new InviteMemberService(
          c.make('organizationRepository') as IOrganizationRepository,
          c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        ),
    )
    container.bind(
      'acceptInvitationService',
      (c: IContainer) =>
        new AcceptInvitationService(
          c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
          c.make('organizationMemberRepository') as IOrganizationMemberRepository,
          c.make('authRepository') as IAuthRepository,
          db as IDatabaseAccess,
        ),
    )
    container.bind(
      'removeMemberService',
      (c: IContainer) =>
        new RemoveMemberService(
          c.make('organizationMemberRepository') as IOrganizationMemberRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
          db as IDatabaseAccess,
          c.make('authRepository') as IAuthRepository,
          c.make('apiKeyRepository') as IApiKeyRepository,
        ),
    )
    container.bind(
      'listMembersService',
      (c: IContainer) =>
        new ListMembersService(
          c.make('organizationMemberRepository') as IOrganizationMemberRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
          c.make('authRepository') as IAuthRepository,
        ),
    )
    container.bind(
      'changeOrgMemberRoleService',
      (c: IContainer) =>
        new ChangeOrgMemberRoleService(
          c.make('organizationMemberRepository') as IOrganizationMemberRepository,
          db as IDatabaseAccess,
          c.make('authRepository') as IAuthRepository,
        ),
    )
    container.bind(
      'listInvitationsService',
      (c: IContainer) =>
        new ListInvitationsService(
          c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        ),
    )
    container.bind(
      'cancelInvitationService',
      (c: IContainer) =>
        new CancelInvitationService(
          c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        ),
    )
    container.bind(
      'getUserMembershipService',
      (c: IContainer) =>
        new GetUserMembershipService(
          c.make('organizationMemberRepository') as IOrganizationMemberRepository,
        ),
    )
    container.bind(
      'acceptInvitationByIdService',
      (c: IContainer) =>
        new AcceptInvitationByIdService(
          c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
          c.make('organizationMemberRepository') as IOrganizationMemberRepository,
          c.make('authRepository') as IAuthRepository,
          db as IDatabaseAccess,
        ),
    )
    container.bind(
      'declineInvitationService',
      (c: IContainer) =>
        new DeclineInvitationService(
          c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
          c.make('authRepository') as IAuthRepository,
        ),
    )
    container.bind(
      'getPendingInvitationsService',
      (c: IContainer) =>
        new GetPendingInvitationsService(
          c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
          c.make('authRepository') as IAuthRepository,
          c.make('organizationRepository') as IOrganizationRepository,
        ),
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind(
      'organizationController',
      (c: IContainer) =>
        new OrganizationController(
          c.make('createOrganizationService') as CreateOrganizationService,
          c.make('updateOrganizationService') as UpdateOrganizationService,
          c.make('listOrganizationsService') as ListOrganizationsService,
          c.make('inviteMemberService') as InviteMemberService,
          c.make('acceptInvitationService') as AcceptInvitationService,
          c.make('removeMemberService') as RemoveMemberService,
          c.make('listMembersService') as ListMembersService,
          c.make('changeOrgMemberRoleService') as ChangeOrgMemberRoleService,
          c.make('getOrganizationService') as GetOrganizationService,
          c.make('changeOrgStatusService') as ChangeOrgStatusService,
          c.make('listInvitationsService') as ListInvitationsService,
          c.make('cancelInvitationService') as CancelInvitationService,
          c.make('acceptInvitationByIdService') as AcceptInvitationByIdService,
          c.make('declineInvitationService') as DeclineInvitationService,
          c.make('jwtTokenService') as IJwtTokenService,
          c.make('authTokenRepository') as IAuthTokenRepository,
        ),
    )
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('organizationController') as OrganizationController
    void registerOrganizationRoutes(context.router, controller)
  }

  override boot(_container: IContainer): void {
    console.log('🏢 [Organization] Module loaded')
  }
}
