/**
 * Usage sync page bindings for the Admin module.
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminUsageSyncPage } from '../Pages/AdminUsageSyncPage'

/**
 * Registers the admin usage sync page in the DI container.
 *
 * @param container - Application container.
 */
export function registerUsageSyncBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(k.usageSync, (c) => new AdminUsageSyncPage(c.make(i) as InertiaService))
}
