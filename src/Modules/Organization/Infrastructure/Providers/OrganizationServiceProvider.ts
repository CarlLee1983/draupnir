import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { OrganizationController } from '../../Presentation/Controllers/OrganizationController'
import { registerOrganizationRoutes } from '../../Presentation/Routes/organization.routes'
import type { ProvisionOrganizationDefaultsService } from '@/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { AcceptInvitationService } from '../../Application/Services/AcceptInvitationService'
import { CancelInvitationService } from '../../Application/Services/CancelInvitationService'
import { ChangeOrgMemberRoleService } from '../../Application/Services/ChangeOrgMemberRoleService'
import { ChangeOrgStatusService } from '../../Application/Services/ChangeOrgStatusService'
import { CreateOrganizationService } from '../../Application/Services/CreateOrganizationService'
import { GetOrganizationService } from '../../Application/Services/GetOrganizationService'
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
import { OrganizationInvitationRepository } from '../Repositories/OrganizationInvitationRepository'
import { OrganizationMemberRepository } from '../Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '../Repositories/OrganizationRepository'

export class OrganizationServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('organizationRepository', () => new OrganizationRepository(db))
    container.singleton('organizationMemberRepository', () => new OrganizationMemberRepository(db))
    container.singleton(
      'organizationInvitationRepository',
      () => new OrganizationInvitationRepository(db),
    )

    container.singleton('orgAuthorizationHelper', (c: IContainer) => {
      return new OrgAuthorizationHelper(
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
      )
    })

    container.bind('createOrganizationService', (c: IContainer) => {
      return new CreateOrganizationService(
        c.make('organizationRepository') as IOrganizationRepository,
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
        c.make('authRepository') as IAuthRepository,
        db as IDatabaseAccess,
        c.make('provisionOrganizationDefaultsService') as ProvisionOrganizationDefaultsService,
      )
    })

    container.bind('updateOrganizationService', (c: IContainer) => {
      return new UpdateOrganizationService(
        c.make('organizationRepository') as IOrganizationRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('listOrganizationsService', (c: IContainer) => {
      return new ListOrganizationsService(
        c.make('organizationRepository') as IOrganizationRepository,
      )
    })

    container.bind('getOrganizationService', (c: IContainer) => {
      return new GetOrganizationService(
        c.make('organizationRepository') as IOrganizationRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('changeOrgStatusService', (c: IContainer) => {
      return new ChangeOrgStatusService(
        c.make('organizationRepository') as IOrganizationRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('inviteMemberService', (c: IContainer) => {
      return new InviteMemberService(
        c.make('organizationRepository') as IOrganizationRepository,
        c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('acceptInvitationService', (c: IContainer) => {
      return new AcceptInvitationService(
        c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
        c.make('authRepository') as IAuthRepository,
        db as IDatabaseAccess,
      )
    })

    container.bind('removeMemberService', (c: IContainer) => {
      return new RemoveMemberService(
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        db as IDatabaseAccess,
      )
    })

    container.bind('listMembersService', (c: IContainer) => {
      return new ListMembersService(
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('changeOrgMemberRoleService', (c: IContainer) => {
      return new ChangeOrgMemberRoleService(
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
        db as IDatabaseAccess,
      )
    })

    container.bind('listInvitationsService', (c: IContainer) => {
      return new ListInvitationsService(
        c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('cancelInvitationService', (c: IContainer) => {
      return new CancelInvitationService(
        c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })
  }

  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new OrganizationController(
      core.container.make('createOrganizationService') as any,
      core.container.make('updateOrganizationService') as any,
      core.container.make('listOrganizationsService') as any,
      core.container.make('inviteMemberService') as any,
      core.container.make('acceptInvitationService') as any,
      core.container.make('removeMemberService') as any,
      core.container.make('listMembersService') as any,
      core.container.make('changeOrgMemberRoleService') as any,
      core.container.make('getOrganizationService') as any,
      core.container.make('changeOrgStatusService') as any,
      core.container.make('listInvitationsService') as any,
      core.container.make('cancelInvitationService') as any,
    )
    void registerOrganizationRoutes(router, controller)
  }

  override boot(_context: unknown): void {
    console.log('🏢 [Organization] Module loaded')
  }
}
