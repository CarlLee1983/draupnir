import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { registerApiKeysBindings } from './apiKeys'
import { registerDashboardBindings } from './dashboard'
import { registerMembersBindings } from './members'
import { registerOrganizationBindings } from './organization'
import { registerSettingsBindings } from './settings'

/**
 * Registers manager Inertia page classes as container singletons.
 *
 * 各 domain 的 Page 綁定分別定義在：
 * - dashboard.ts / organization.ts / members.ts / apiKeys.ts / settings.ts
 *
 * @param container - Gravito DI container; `InertiaService` must already be bound under
 *   `PAGE_CONTAINER_KEYS.inertiaService`.
 */
export function registerManagerBindings(container: IContainer): void {
  registerDashboardBindings(container)
  registerOrganizationBindings(container)
  registerMembersBindings(container)
  registerApiKeysBindings(container)
  registerSettingsBindings(container)
}
