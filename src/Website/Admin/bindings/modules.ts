/**
 * Modules page bindings for the Admin module.
 */
import type { ListModulesService } from '@/Modules/AppModule/Application/Services/ListModulesService'
import type { RegisterModuleService } from '@/Modules/AppModule/Application/Services/RegisterModuleService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminModuleCreatePage } from '../Pages/AdminModuleCreatePage'
import { AdminModulesPage } from '../Pages/AdminModulesPage'

/**
 * Registers admin modules-related pages in the DI container.
 *
 * @param container - Application container.
 */
export function registerModulesBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.modules,
    (c) =>
      new AdminModulesPage(
        c.make(i) as InertiaService,
        c.make('listModulesService') as ListModulesService,
      ),
  )

  container.singleton(
    k.moduleCreate,
    (c) =>
      new AdminModuleCreatePage(
        c.make(i) as InertiaService,
        c.make('registerModuleService') as RegisterModuleService,
      ),
  )
}
