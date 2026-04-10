import { PAGE_CONTAINER_KEYS } from '@/Pages/pageContainerKeys'
import { registerAdminPageBindings } from '@/Pages/routing/admin/registerAdminPageBindings'
import { createInertiaService } from '@/Pages/routing/inertiaFactory'
import { registerMemberPageBindings } from '@/Pages/routing/member/registerMemberPageBindings'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'

export { PAGE_CONTAINER_KEYS } from '@/Pages/pageContainerKeys'

/**
 * PagesServiceProvider
 *
 * Wires the Inertia server runtime and registers one DI singleton per Inertia page class (admin/member).
 *
 * Responsibilities:
 * - Register `InertiaService` under `PAGE_CONTAINER_KEYS.inertiaService`.
 * - Register all admin and member page handlers with their Application-layer dependencies.
 *
 * Implementation note: Must run after module providers that register the services pages resolve via
 * `container.make(...)`. Route registration happens later in `registerPageRoutes`.
 */
export class PagesServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const { inertiaService } = PAGE_CONTAINER_KEYS

    container.singleton(inertiaService, () => createInertiaService())
    registerAdminPageBindings(container)
    registerMemberPageBindings(container)
  }

  override boot(_context: unknown): void {
    console.log('📄 [Pages] Inertia page bundles registered')
  }
}
