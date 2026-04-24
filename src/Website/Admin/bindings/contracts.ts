import type { ActivateContractService } from '@/Modules/Contract/Application/Services/ActivateContractService'
import type { AdjustContractQuotaService } from '@/Modules/Contract/Application/Services/AdjustContractQuotaService'
import type { CreateContractService } from '@/Modules/Contract/Application/Services/CreateContractService'
import type { GetContractDetailService } from '@/Modules/Contract/Application/Services/GetContractDetailService'
import type { ListAdminContractsService } from '@/Modules/Contract/Application/Services/ListAdminContractsService'
import type { TerminateContractService } from '@/Modules/Contract/Application/Services/TerminateContractService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminContractCreatePage } from '../Pages/AdminContractCreatePage'
import { AdminContractDetailPage } from '../Pages/AdminContractDetailPage'
import { AdminContractsPage } from '../Pages/AdminContractsPage'

export function registerContractsBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.contracts,
    (c) =>
      new AdminContractsPage(
        c.make(i) as InertiaService,
        c.make('listAdminContractsService') as ListAdminContractsService,
      ),
  )

  container.singleton(
    k.contractCreate,
    (c) =>
      new AdminContractCreatePage(
        c.make(i) as InertiaService,
        c.make('createContractService') as CreateContractService,
      ),
  )

  container.singleton(
    k.contractDetail,
    (c) =>
      new AdminContractDetailPage(
        c.make(i) as InertiaService,
        c.make('getContractDetailService') as GetContractDetailService,
        c.make('activateContractService') as ActivateContractService,
        c.make('terminateContractService') as TerminateContractService,
        c.make('adjustContractQuotaService') as AdjustContractQuotaService,
      ),
  )
}
