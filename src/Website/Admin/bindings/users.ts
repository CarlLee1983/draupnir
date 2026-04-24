import type { ChangeUserStatusService } from '@/Modules/Auth/Application/Services/ChangeUserStatusService'
import type { GetUserDetailService } from '@/Modules/Auth/Application/Services/GetUserDetailService'
import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminUserDetailPage } from '../Pages/AdminUserDetailPage'
import { AdminUsersPage } from '../Pages/AdminUsersPage'

export function registerUsersBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.users,
    (c) =>
      new AdminUsersPage(
        c.make(i) as InertiaService,
        c.make('listUsersService') as ListUsersService,
      ),
  )

  container.singleton(
    k.userDetail,
    (c) =>
      new AdminUserDetailPage(
        c.make(i) as InertiaService,
        c.make('getProfileService') as GetProfileService,
        c.make('getUserDetailService') as GetUserDetailService,
        c.make('changeUserStatusService') as ChangeUserStatusService,
      ),
  )
}
