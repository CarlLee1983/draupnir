import type { PlanetCore } from '@gravito/core'
import { registerHealthWithGravito } from '@/Shared/Infrastructure/Framework/GravitoHealthAdapter'
import { registerDocsWithGravito } from '@/Shared/Infrastructure/Framework/GravitoDocsAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { getCurrentORM } from './RepositoryFactory'

// 核心導出（應用啟動時使用）
export { DatabaseAccessBuilder, createDatabaseAccess } from './DatabaseAccessBuilder'
export { setCurrentDatabaseAccess, getCurrentDatabaseAccess, hasCurrentDatabaseAccess } from './CurrentDatabaseAccess'
export { getCurrentORM, getDatabaseAccess } from './RepositoryFactory'
export { initializeRegistry, getRegistry, resetRegistry } from './RepositoryRegistry'
export { createRepositoryFactory } from './RepositoryFactoryGenerator'

/**
 * 應用啟動時的 ORM 配置摘要
 */
export function printORMConfiguration(): void {
	const orm = getCurrentORM()
	console.log(`
╔════════════════════════════════════╗
║       ORM Configuration Report      ║
╠════════════════════════════════════╣
║ Current ORM: ${orm.padEnd(22)} ║
║ Repository Type: ${(orm === 'memory' ? 'In-Memory' : 'Database-Backed').padEnd(17)} ║
║ Environment Variable: ORM=${orm.padEnd(19)} ║
╚════════════════════════════════════╝
	`)
}

/**
 * 註冊 Health 模組（透過完整 Gravito 適配器）
 */
export const registerHealth = (core: PlanetCore): void => {
	registerHealthWithGravito(core)
}

/**
 * 註冊 Docs 模組
 */
export const registerDocs = (core: PlanetCore): Promise<void> => {
	return registerDocsWithGravito(core)
}

import { AuthController, registerAuthRoutes } from '@/Modules/Auth'
import { registerTestSeedRoutes } from '@/Modules/Auth/Presentation/Routes/test-seed.routes'
import { getCurrentDatabaseAccess } from './CurrentDatabaseAccess'

/**
 * 註冊 Auth 模組
 */
export const registerAuth = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const registerService = core.container.make('registerUserService') as any
	const loginService = core.container.make('loginUserService') as any
	const refreshTokenService = core.container.make('refreshTokenService') as any
	const logoutUserService = core.container.make('logoutUserService') as any
	const controller = new AuthController(registerService, loginService, refreshTokenService, logoutUserService)
	void registerAuthRoutes(router, controller)

	if (getCurrentORM() === 'memory') {
		registerTestSeedRoutes(router, getCurrentDatabaseAccess())
	}
}

import { UserController, registerUserRoutes } from '@/Modules/User'

/**
 * 註冊 User 模組
 */
export const registerUser = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const getUserProfileService = core.container.make('getUserProfileService') as any
	const updateUserProfileService = core.container.make('updateUserProfileService') as any
	const listUsersService = core.container.make('listUsersService') as any
	const changeUserStatusService = core.container.make('changeUserStatusService') as any
	const controller = new UserController(
		getUserProfileService, updateUserProfileService,
		listUsersService, changeUserStatusService
	)
	registerUserRoutes(router, controller)
}

import { OrganizationController, registerOrganizationRoutes } from '@/Modules/Organization'

/**
 * 註冊 Organization 模組
 */
export const registerOrganization = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const controller = new OrganizationController(
		core.container.make('createOrganizationService') as any,
		core.container.make('updateOrganizationService') as any,
		core.container.make('listOrganizationsService') as any,
		core.container.make('inviteMemberService') as any,
		core.container.make('acceptInvitationService') as any,
		core.container.make('removeMemberService') as any,
		core.container.make('listMembersService') as any,
		core.container.make('changeOrgMemberRoleService') as any,
		core.container.make('getOrganizationService') as any,
		core.container.make('changeOrgStatusService') as any,
		core.container.make('listInvitationsService') as any,
		core.container.make('cancelInvitationService') as any,
	)
	void registerOrganizationRoutes(router, controller)
}

import { ApiKeyController, registerApiKeyRoutes } from '@/Modules/ApiKey'

/**
 * 註冊 ApiKey 模組
 */
export const registerApiKey = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const controller = new ApiKeyController(
		core.container.make('createApiKeyService') as any,
		core.container.make('listApiKeysService') as any,
		core.container.make('revokeApiKeyService') as any,
		core.container.make('updateKeyLabelService') as any,
		core.container.make('setKeyPermissionsService') as any,
	)
	registerApiKeyRoutes(router, controller)
}

import { DashboardController, registerDashboardRoutes } from '@/Modules/Dashboard'

/**
 * 註冊 Dashboard 模組
 */
export const registerDashboard = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const controller = new DashboardController(
		core.container.make('getDashboardSummaryService') as any,
		core.container.make('getUsageChartService') as any,
	)
	registerDashboardRoutes(router, controller)
}

import { CreditController, registerCreditRoutes } from '@/Modules/Credit'

/**
 * 註冊 Credit 模組
 */
export const registerCredit = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const controller = new CreditController(
		core.container.make('topUpCreditService') as any,
		core.container.make('getBalanceService') as any,
		core.container.make('getTransactionHistoryService') as any,
	)
	registerCreditRoutes(router, controller)
}
