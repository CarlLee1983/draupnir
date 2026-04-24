/**
 * API keys page bindings for the Admin module.
 */
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminApiKeysPage } from '../Pages/AdminApiKeysPage'

/**
 * Registers the admin API keys page in the DI container.
 *
 * @param container - Application container.
 */
export function registerApiKeysBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.apiKeys,
    (c) =>
      new AdminApiKeysPage(
        c.make(i) as InertiaService,
        c.make('listApiKeysService') as ListApiKeysService,
        c.make('listOrganizationsService') as ListOrganizationsService,
      ),
  )
}
