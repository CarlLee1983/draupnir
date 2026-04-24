import type { ChangePasswordService } from '@/Modules/Auth/Application/Services/ChangePasswordService'
import type { ListSessionsService } from '@/Modules/Auth/Application/Services/ListSessionsService'
import type { RevokeAllSessionsService } from '@/Modules/Auth/Application/Services/RevokeAllSessionsService'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { MEMBER_PAGE_KEYS } from '../keys'
import { MemberSettingsPage } from '../Pages/MemberSettingsPage'

export function registerSettingsBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MEMBER_PAGE_KEYS

  container.singleton(
    k.settings,
    (c) =>
      new MemberSettingsPage(
        c.make(i) as InertiaService,
        c.make('getProfileService') as GetProfileService,
        c.make('updateProfileService') as UpdateProfileService,
        c.make('changePasswordService') as ChangePasswordService,
        c.make('listSessionsService') as ListSessionsService,
        c.make('revokeAllSessionsService') as RevokeAllSessionsService,
      ),
  )
}
