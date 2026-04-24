import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { registerAlertsBindings } from './alerts'
import { registerApiKeysBindings } from './apiKeys'
import { registerContractsBindings } from './contracts'
import { registerCostBreakdownBindings } from './costBreakdown'
import { registerDashboardBindings } from './dashboard'
import { registerSettingsBindings } from './settings'
import { registerUsageBindings } from './usage'

/**
 * Registers member Inertia page classes as container singletons.
 *
 * 各 domain 的 Page 綁定分別定義在：
 * - dashboard.ts / apiKeys.ts / usage.ts / costBreakdown.ts
 * - contracts.ts / settings.ts / alerts.ts
 *
 * @param container - Gravito DI container; `InertiaService` must already be bound under
 *   `PAGE_CONTAINER_KEYS.inertiaService`.
 */
export function registerMemberBindings(container: IContainer): void {
  registerDashboardBindings(container)
  registerApiKeysBindings(container)
  registerUsageBindings(container)
  registerCostBreakdownBindings(container)
  registerContractsBindings(container)
  registerSettingsBindings(container)
  registerAlertsBindings(container)
}
