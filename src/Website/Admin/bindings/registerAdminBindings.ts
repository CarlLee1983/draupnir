import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { registerApiKeysBindings } from './apiKeys'
import { registerContractsBindings } from './contracts'
import { registerDashboardBindings } from './dashboard'
import { registerModulesBindings } from './modules'
import { registerOrganizationsBindings } from './organizations'
import { registerReportsBindings } from './reports'
import { registerUsageSyncBindings } from './usageSync'
import { registerUsersBindings } from './users'

/**
 * Registers admin Inertia page classes as container singletons.
 *
 * 各 domain 的 Page 綁定分別定義在：
 * - dashboard.ts / users.ts / organizations.ts / contracts.ts
 * - modules.ts / apiKeys.ts / reports.ts / usageSync.ts
 *
 * @param container - Gravito DI container; `InertiaService` must already be bound under
 *   `PAGE_CONTAINER_KEYS.inertiaService`.
 */
export function registerAdminBindings(container: IContainer): void {
  registerDashboardBindings(container)
  registerUsersBindings(container)
  registerOrganizationsBindings(container)
  registerContractsBindings(container)
  registerModulesBindings(container)
  registerApiKeysBindings(container)
  registerReportsBindings(container)
  registerUsageSyncBindings(container)
}
