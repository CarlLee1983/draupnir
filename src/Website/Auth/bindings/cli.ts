/**
 * CLI-related page bindings for the Auth module.
 */
import type { AuthorizeDeviceService } from '@/Modules/CliApi/Application/Services/AuthorizeDeviceService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AUTH_PAGE_KEYS } from '../keys'
import { VerifyDevicePage } from '../Pages/VerifyDevicePage'

/**
 * Registers CLI-related authentication pages (e.g., device flow verification).
 *
 * @param container - Application container.
 */
export function registerCliBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = AUTH_PAGE_KEYS

  container.singleton(
    k.verifyDevice,
    (c) =>
      new VerifyDevicePage(
        c.make(i) as InertiaService,
        c.make('authorizeDeviceService') as AuthorizeDeviceService,
      ),
  )
}
