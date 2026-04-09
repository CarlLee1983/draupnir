// src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import { UserProfileRepository } from '../Repositories/UserProfileRepository'
import { GetProfileService } from '../../Application/Services/GetProfileService'
import { UpdateProfileService } from '../../Application/Services/UpdateProfileService'

export class ProfileServiceProvider extends ModuleServiceProvider {
	override register(container: IContainer): void {
		const db = getCurrentDatabaseAccess()

		container.singleton('profileRepository', () => {
			return new UserProfileRepository(db)
		})

		container.bind('getProfileService', (c: IContainer) => {
			const repo = c.make('profileRepository') as IUserProfileRepository
			return new GetProfileService(repo)
		})

		container.bind('updateProfileService', (c: IContainer) => {
			const repo = c.make('profileRepository') as IUserProfileRepository
			return new UpdateProfileService(repo)
		})

	}

	override boot(_context: any): void {
		console.log('👤 [Profile] Module loaded')
	}
}
