/**
 * Registers manager Inertia page classes as container singletons with their
 * Application-layer dependencies.
 */
import type { AssignApiKeyService } from '@/Modules/ApiKey/Application/Services/AssignApiKeyService'
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { RevokeApiKeyService } from '@/Modules/ApiKey/Application/Services/RevokeApiKeyService'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { InviteMemberService } from '@/Modules/Organization/Application/Services/InviteMemberService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { RemoveMemberService } from '@/Modules/Organization/Application/Services/RemoveMemberService'
import type { UpdateOrganizationService } from '@/Modules/Organization/Application/Services/UpdateOrganizationService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ManagerApiKeysPage } from '../Pages/ManagerApiKeysPage'
import { ManagerDashboardPage } from '../Pages/ManagerDashboardPage'
import { ManagerMembersPage } from '../Pages/ManagerMembersPage'
import { ManagerOrganizationPage } from '../Pages/ManagerOrganizationPage'
import { MANAGER_PAGE_KEYS } from '../keys'

export function registerManagerBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MANAGER_PAGE_KEYS

  container.singleton(k.dashboard, (c) => {
    return new ManagerDashboardPage(
      c.make(i) as InertiaService,
      c.make('getBalanceService') as GetBalanceService,
      c.make('listApiKeysService') as ListApiKeysService,
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
    )
  })

  container.singleton(k.organization, (c) => {
    return new ManagerOrganizationPage(
      c.make(i) as InertiaService,
      c.make('getOrganizationService') as GetOrganizationService,
      c.make('listContractsService') as ListContractsService,
      c.make('updateOrganizationService') as UpdateOrganizationService,
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
    )
  })

  container.singleton(k.members, (c) => {
    return new ManagerMembersPage(
      c.make(i) as InertiaService,
      c.make('listMembersService') as ListMembersService,
      c.make('inviteMemberService') as InviteMemberService,
      c.make('removeMemberService') as RemoveMemberService,
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
    )
  })

  container.singleton(k.apiKeys, (c) => {
    return new ManagerApiKeysPage(
      c.make(i) as InertiaService,
      c.make('listApiKeysService') as ListApiKeysService,
      c.make('listMembersService') as ListMembersService,
      c.make('assignApiKeyService') as AssignApiKeyService,
      c.make('revokeApiKeyService') as RevokeApiKeyService,
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
    )
  })

  // Phase J–K 會補齊其他 page 的 binding
}
