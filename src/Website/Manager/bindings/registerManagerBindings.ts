/**
 * Registers manager Inertia page classes as container singletons with their
 * Application-layer dependencies.
 */
import type { AssignApiKeyService } from '@/Modules/ApiKey/Application/Services/AssignApiKeyService'
import type { CreateApiKeyService } from '@/Modules/ApiKey/Application/Services/CreateApiKeyService'
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { RevokeApiKeyService } from '@/Modules/ApiKey/Application/Services/RevokeApiKeyService'
import type { SumQuotaAllocatedForOrgService } from '@/Modules/ApiKey/Application/Services/SumQuotaAllocatedForOrgService'
import type { GetActiveOrgContractQuotaService } from '@/Modules/Contract/Application/Services/GetActiveOrgContractQuotaService'
import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import type { InviteMemberService } from '@/Modules/Organization/Application/Services/InviteMemberService'
import type { ListInvitationsService } from '@/Modules/Organization/Application/Services/ListInvitationsService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { RemoveMemberService } from '@/Modules/Organization/Application/Services/RemoveMemberService'
import type { UpdateOrganizationService } from '@/Modules/Organization/Application/Services/UpdateOrganizationService'
import type { ChangePasswordService } from '@/Modules/Auth/Application/Services/ChangePasswordService'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ManagerApiKeyCreatePage } from '../Pages/ManagerApiKeyCreatePage'
import { ManagerApiKeysPage } from '../Pages/ManagerApiKeysPage'
import { ManagerDashboardPage } from '../Pages/ManagerDashboardPage'
import { ManagerMembersPage } from '../Pages/ManagerMembersPage'
import { ManagerOrganizationPage } from '../Pages/ManagerOrganizationPage'
import { ManagerSettingsPage } from '../Pages/ManagerSettingsPage'
import { MANAGER_PAGE_KEYS } from '../keys'

export function registerManagerBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MANAGER_PAGE_KEYS

  container.singleton(k.dashboard, (c) => {
    return new ManagerDashboardPage(
      c.make(i) as InertiaService,
      c.make('getActiveOrgContractQuotaService') as GetActiveOrgContractQuotaService,
      c.make('sumQuotaAllocatedForOrgService') as SumQuotaAllocatedForOrgService,
      c.make('listApiKeysService') as ListApiKeysService,
      c.make('getUserMembershipService') as GetUserMembershipService,
    )
  })

  container.singleton(k.organization, (c) => {
    return new ManagerOrganizationPage(
      c.make(i) as InertiaService,
      c.make('getOrganizationService') as GetOrganizationService,
      c.make('listContractsService') as ListContractsService,
      c.make('updateOrganizationService') as UpdateOrganizationService,
      c.make('getUserMembershipService') as GetUserMembershipService,
    )
  })

  container.singleton(k.members, (c) => {
    return new ManagerMembersPage(
      c.make(i) as InertiaService,
      c.make('listMembersService') as ListMembersService,
      c.make('inviteMemberService') as InviteMemberService,
      c.make('removeMemberService') as RemoveMemberService,
      c.make('listApiKeysService') as ListApiKeysService,
      c.make('getUserMembershipService') as GetUserMembershipService,
      c.make('listInvitationsService') as ListInvitationsService,
    )
  })

  container.singleton(k.apiKeys, (c) => {
    return new ManagerApiKeysPage(
      c.make(i) as InertiaService,
      c.make('listApiKeysService') as ListApiKeysService,
      c.make('listMembersService') as ListMembersService,
      c.make('assignApiKeyService') as AssignApiKeyService,
      c.make('revokeApiKeyService') as RevokeApiKeyService,
      c.make('getUserMembershipService') as GetUserMembershipService,
    )
  })

  container.singleton(k.apiKeyCreate, (c) => {
    return new ManagerApiKeyCreatePage(
      c.make(i) as InertiaService,
      c.make('createApiKeyService') as CreateApiKeyService,
      c.make('assignApiKeyService') as AssignApiKeyService,
      c.make('listMembersService') as ListMembersService,
      c.make('getUserMembershipService') as GetUserMembershipService,
      c.make('getActiveOrgContractQuotaService') as GetActiveOrgContractQuotaService,
      c.make('sumQuotaAllocatedForOrgService') as SumQuotaAllocatedForOrgService,
    )
  })

  container.singleton(k.settings, (c) => {
    return new ManagerSettingsPage(
      c.make(i) as InertiaService,
      c.make('getProfileService') as GetProfileService,
      c.make('updateProfileService') as UpdateProfileService,
      c.make('changePasswordService') as ChangePasswordService,
    )
  })
}
