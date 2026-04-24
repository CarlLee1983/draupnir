import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import type { InviteMemberService } from '@/Modules/Organization/Application/Services/InviteMemberService'
import type { ListInvitationsService } from '@/Modules/Organization/Application/Services/ListInvitationsService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { RemoveMemberService } from '@/Modules/Organization/Application/Services/RemoveMemberService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { MANAGER_PAGE_KEYS } from '../keys'
import { ManagerMembersPage } from '../Pages/ManagerMembersPage'

export function registerMembersBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MANAGER_PAGE_KEYS

  container.singleton(k.members, (c) => {
    return new ManagerMembersPage(
      c.make(i) as InertiaService,
      c.make('listMembersService') as ListMembersService,
      c.make('inviteMemberService') as InviteMemberService,
      c.make('removeMemberService') as RemoveMemberService,
      c.make('listApiKeysService') as ListApiKeysService,
      c.make('getUserMembershipService') as GetUserMembershipService,
      c.make('listInvitationsService') as ListInvitationsService,
    )
  })
}
