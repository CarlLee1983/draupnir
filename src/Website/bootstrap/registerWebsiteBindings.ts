import { registerAdminBindings } from '@/Website/Admin/bindings/registerAdminBindings'
import { registerAuthBindings } from '@/Website/Auth/bindings/registerAuthBindings'
import {
  PAGE_CONTAINER_KEYS,
  getInertiaServiceSingleton,
} from '@/Website/Http/Inertia/createInertiaRequestHandler'
import { registerMemberBindings } from '@/Website/Member/bindings/registerMemberBindings'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

/**
 * Registers all Website DI bindings: Inertia runtime + all slice page handlers.
 *
 * Must run after module providers that register services pages depend on.
 * `bootstrap` must `await warmInertiaService()` before route resolution.
 *
 * @param container - Gravito DI container.
 */
export function registerWebsiteBindings(container: IContainer): void {
  const { inertiaService } = PAGE_CONTAINER_KEYS
  container.singleton(inertiaService, () => getInertiaServiceSingleton())
  registerAuthBindings(container)
  registerAdminBindings(container)
  registerMemberBindings(container)
}
