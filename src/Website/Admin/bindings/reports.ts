/**
 * Reports page bindings for the Admin module.
 */
import type { IUsageRepository } from '@/Modules/Dashboard/Application/Ports/IUsageRepository'
import type { IReportRepository } from '@/Modules/Reports/Domain/Repositories/IReportRepository'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminReportsPage } from '../Pages/AdminReportsPage'
import { AdminReportTemplatePage } from '../Pages/AdminReportTemplatePage'

/**
 * Registers admin reports-related pages in the DI container.
 *
 * @param container - Application container.
 */
export function registerReportsBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.reports,
    (c) =>
      new AdminReportsPage(
        c.make(i) as InertiaService,
        c.make('reportRepository') as IReportRepository,
      ),
  )

  container.singleton(
    k.reportTemplate,
    (c) =>
      new AdminReportTemplatePage(
        c.make(i) as InertiaService,
        c.make('reportRepository') as IReportRepository,
        c.make('atlasUsageRepository') as IUsageRepository,
      ),
  )
}
