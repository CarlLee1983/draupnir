/**
 * Registers member Inertia page classes as container singletons with their Application-layer dependencies.
 */
import type { CreateApiKeyService } from '@/Modules/ApiKey/Application/Services/CreateApiKeyService'
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { RevokeApiKeyService } from '@/Modules/ApiKey/Application/Services/RevokeApiKeyService'
import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { GetDashboardSummaryService } from '@/Modules/Dashboard/Application/Services/GetDashboardSummaryService'
import type { GetUsageChartService } from '@/Modules/Dashboard/Application/Services/GetUsageChartService'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import type { InertiaService } from '@/Pages/InertiaService'
import { PAGE_CONTAINER_KEYS } from '@/Pages/pageContainerKeys'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

import { MemberApiKeyCreatePage } from '../../Member/MemberApiKeyCreatePage'
import { MemberApiKeyRevokeHandler } from '../../Member/MemberApiKeyRevokeHandler'
import { MemberApiKeysPage } from '../../Member/MemberApiKeysPage'
import { MemberContractsPage } from '../../Member/MemberContractsPage'
import { MemberDashboardPage } from '../../Member/MemberDashboardPage'
import { MemberSettingsPage } from '../../Member/MemberSettingsPage'
import { MemberUsagePage } from '../../Member/MemberUsagePage'

import { MEMBER_PAGE_KEYS } from './memberPageKeys'

/**
 * @param container - Gravito DI container; `InertiaService` must already be bound under
 *   `PAGE_CONTAINER_KEYS.inertiaService`.
 */
export function registerMemberPageBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MEMBER_PAGE_KEYS

  container.singleton(k.dashboard, (c) => {
    const summaryService = c.make('getDashboardSummaryService') as GetDashboardSummaryService
    return new MemberDashboardPage(
      c.make(i) as InertiaService,
      summaryService,
      c.make('getBalanceService') as GetBalanceService,
    )
  })

  container.singleton(
    k.apiKeys,
    (c) =>
      new MemberApiKeysPage(
        c.make(i) as InertiaService,
        c.make('listApiKeysService') as ListApiKeysService,
      ),
  )

  container.singleton(
    k.apiKeyCreate,
    (c) =>
      new MemberApiKeyCreatePage(
        c.make(i) as InertiaService,
        c.make('createApiKeyService') as CreateApiKeyService,
      ),
  )

  container.singleton(
    k.apiKeyRevoke,
    (c) => new MemberApiKeyRevokeHandler(c.make('revokeApiKeyService') as RevokeApiKeyService),
  )

  container.singleton(
    k.usage,
    (c) =>
      new MemberUsagePage(
        c.make(i) as InertiaService,
        c.make('getUsageChartService') as GetUsageChartService,
      ),
  )

  container.singleton(
    k.contracts,
    (c) =>
      new MemberContractsPage(
        c.make(i) as InertiaService,
        c.make('listContractsService') as ListContractsService,
      ),
  )

  container.singleton(
    k.settings,
    (c) =>
      new MemberSettingsPage(
        c.make(i) as InertiaService,
        c.make('getProfileService') as GetProfileService,
        c.make('updateProfileService') as UpdateProfileService,
      ),
  )
}
