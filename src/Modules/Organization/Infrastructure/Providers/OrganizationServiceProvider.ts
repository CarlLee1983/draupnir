import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { OrganizationRepository } from '../Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '../Repositories/OrganizationMemberRepository'
import { OrganizationInvitationRepository } from '../Repositories/OrganizationInvitationRepository'
import { OrgAuthorizationHelper } from '../../Application/Services/OrgAuthorizationHelper'
import { CreateOrganizationService } from '../../Application/Services/CreateOrganizationService'
import { UpdateOrganizationService } from '../../Application/Services/UpdateOrganizationService'
import { ListOrganizationsService } from '../../Application/Services/ListOrganizationsService'
import { InviteMemberService } from '../../Application/Services/InviteMemberService'
import { AcceptInvitationService } from '../../Application/Services/AcceptInvitationService'
import { RemoveMemberService } from '../../Application/Services/RemoveMemberService'
import { ListMembersService } from '../../Application/Services/ListMembersService'
import { ChangeOrgMemberRoleService } from '../../Application/Services/ChangeOrgMemberRoleService'
import { GetOrganizationService } from '../../Application/Services/GetOrganizationService'
import { ChangeOrgStatusService } from '../../Application/Services/ChangeOrgStatusService'
import { ListInvitationsService } from '../../Application/Services/ListInvitationsService'
import { CancelInvitationService } from '../../Application/Services/CancelInvitationService'

export class OrganizationServiceProvider extends ModuleServiceProvider {
	override register(container: IContainer): void {
		const db = getCurrentDatabaseAccess()

		container.singleton('organizationRepository', () => new OrganizationRepository(db))
		container.singleton('organizationMemberRepository', () => new OrganizationMemberRepository(db))
		container.singleton('organizationInvitationRepository', () => new OrganizationInvitationRepository(db))

		container.singleton('orgAuthorizationHelper', (c: IContainer) => {
			return new OrgAuthorizationHelper(c.make('organizationMemberRepository') as IOrganizationMemberRepository)
		})

		container.bind('createOrganizationService', (c: IContainer) => {
			return new CreateOrganizationService(
				c.make('organizationRepository') as IOrganizationRepository,
				c.make('organizationMemberRepository') as IOrganizationMemberRepository,
				c.make('authRepository') as IAuthRepository,
				db as IDatabaseAccess,
			)
		})

		container.bind('updateOrganizationService', (c: IContainer) => {
			return new UpdateOrganizationService(c.make('organizationRepository') as IOrganizationRepository)
		})

		container.bind('listOrganizationsService', (c: IContainer) => {
			return new ListOrganizationsService(c.make('organizationRepository') as IOrganizationRepository)
		})

		container.bind('getOrganizationService', (c: IContainer) => {
			return new GetOrganizationService(
				c.make('organizationRepository') as IOrganizationRepository,
				c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
			)
		})

		container.bind('changeOrgStatusService', (c: IContainer) => {
			return new ChangeOrgStatusService(c.make('organizationRepository') as IOrganizationRepository)
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

	override boot(_context: unknown): void {
		console.log('🏢 [Organization] Module loaded')
	}
}
