// src/Modules/User/Infrastructure/Providers/UserServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import { UserProfileRepository } from '../Repositories/UserProfileRepository'
import { GetUserProfileService } from '../../Application/Services/GetUserProfileService'
import { UpdateUserProfileService } from '../../Application/Services/UpdateUserProfileService'
import { ListUsersService } from '../../Application/Services/ListUsersService'
import { ChangeUserStatusService } from '../../Application/Services/ChangeUserStatusService'

export class UserServiceProvider extends ModuleServiceProvider {
	override register(container: IContainer): void {
		const db = getCurrentDatabaseAccess()

		container.singleton('userProfileRepository', () => {
			return new UserProfileRepository(db)
		})

		container.bind('getUserProfileService', (c: IContainer) => {
			const repo = c.make('userProfileRepository') as IUserProfileRepository
			return new GetUserProfileService(repo)
		})

		container.bind('updateUserProfileService', (c: IContainer) => {
			const repo = c.make('userProfileRepository') as IUserProfileRepository
			return new UpdateUserProfileService(repo)
		})

		container.bind('listUsersService', (c: IContainer) => {
			const repo = c.make('userProfileRepository') as IUserProfileRepository
			return new ListUsersService(repo)
		})

		container.bind('changeUserStatusService', (c: IContainer) => {
			const authRepo = c.make('authRepository') as IAuthRepository
			const authTokenRepo = c.make('authTokenRepository') as IAuthTokenRepository
			return new ChangeUserStatusService(authRepo, authTokenRepo)
		})
	}

	override boot(_context: any): void {
		console.log('👤 [User] Module loaded')
	}
}
