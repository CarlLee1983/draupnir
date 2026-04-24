import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { registerAuthPagesBindings } from './auth'
import { registerCliBindings } from './cli'
import { registerHomeBindings } from './home'

/**
 * Registers Auth Inertia page classes as container singletons.
 *
 * 各 domain 的 Page 綁定分別定義在：
 * - home.ts / auth.ts / cli.ts
 *
 * @param container - Gravito DI container; `InertiaService` must already be bound under
 *   `PAGE_CONTAINER_KEYS.inertiaService`.
 */
export function registerAuthBindings(container: IContainer): void {
  registerHomeBindings(container)
  registerAuthPagesBindings(container)
  registerCliBindings(container)
}
