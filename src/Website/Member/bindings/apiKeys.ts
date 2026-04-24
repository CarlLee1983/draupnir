import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { GetPendingInvitationsService } from '@/Modules/Organization/Application/Services/GetPendingInvitationsService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { MEMBER_PAGE_KEYS } from '../keys'
import { MemberApiKeysPage } from '../Pages/MemberApiKeysPage'

export function registerApiKeysBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MEMBER_PAGE_KEYS

  container.singleton(
    k.apiKeys,
    (c) =>
      new MemberApiKeysPage(
        c.make(i) as InertiaService,
        c.make('listApiKeysService') as ListApiKeysService,
        c.make('getUserMembershipService') as GetUserMembershipService,
        c.make('getBalanceService') as GetBalanceService,
        c.make('getPendingInvitationsService') as GetPendingInvitationsService,
      ),
  )
}
