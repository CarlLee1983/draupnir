/**
 * API keys page bindings for the Manager module.
 */
import type { AssignApiKeyService } from '@/Modules/ApiKey/Application/Services/AssignApiKeyService'
import type { CreateApiKeyService } from '@/Modules/ApiKey/Application/Services/CreateApiKeyService'
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { RevokeApiKeyService } from '@/Modules/ApiKey/Application/Services/RevokeApiKeyService'
import type { SumQuotaAllocatedForOrgService } from '@/Modules/ApiKey/Application/Services/SumQuotaAllocatedForOrgService'
import type { GetActiveOrgContractQuotaService } from '@/Modules/Contract/Application/Services/GetActiveOrgContractQuotaService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { MANAGER_PAGE_KEYS } from '../keys'
import { ManagerApiKeyCreatePage } from '../Pages/ManagerApiKeyCreatePage'
import { ManagerApiKeysPage } from '../Pages/ManagerApiKeysPage'

/**
 * Registers manager API keys-related pages in the DI container.
 *
 * @param container - Application container.
 */
export function registerApiKeysBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MANAGER_PAGE_KEYS

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
}
