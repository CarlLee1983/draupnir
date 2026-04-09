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

import { ProfileController, registerProfileRoutes } from '@/Modules/Profile'

/**
 * 註冊 User 模組
 */
export const registerProfile = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const getProfileService = core.container.make('getProfileService') as any
	const updateProfileService = core.container.make('updateProfileService') as any
	const listUsersService = core.container.make('listUsersService') as any
	const changeUserStatusService = core.container.make('changeUserStatusService') as any
	const controller = new ProfileController(
		getProfileService, updateProfileService,
		listUsersService, changeUserStatusService
	)
	registerProfileRoutes(router, controller)
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
		core.container.make('refundCreditService') as any,
	)
	registerCreditRoutes(router, controller)
}

import { ContractController, registerContractRoutes } from '@/Modules/Contract'

/**
 * 註冊 Contract 模組
 */
export const registerContract = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const controller = new ContractController(
		core.container.make('createContractService') as any,
		core.container.make('activateContractService') as any,
		core.container.make('updateContractService') as any,
		core.container.make('assignContractService') as any,
		core.container.make('terminateContractService') as any,
		core.container.make('renewContractService') as any,
		core.container.make('listContractsService') as any,
		core.container.make('getContractDetailService') as any,
		core.container.make('handleContractExpiryService') as any,
	)
	registerContractRoutes(router, controller)
}

import { AppModuleController, registerAppModuleRoutes } from '@/Modules/AppModule'
import { setCheckModuleAccessService } from '@/Shared/Infrastructure/Middleware/ModuleAccessMiddleware'
import type { CheckModuleAccessService } from '@/Modules/AppModule/Application/Services/CheckModuleAccessService'

/**
 * 註冊 AppModule 模組
 */
export const registerAppModule = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const controller = new AppModuleController(
		core.container.make('registerModuleService') as any,
		core.container.make('subscribeModuleService') as any,
		core.container.make('unsubscribeModuleService') as any,
		core.container.make('listModulesService') as any,
		core.container.make('getModuleDetailService') as any,
		core.container.make('listOrgSubscriptionsService') as any,
	)
	registerAppModuleRoutes(router, controller)

	// 初始化 ModuleAccessMiddleware
	const checkAccessService = core.container.make('checkModuleAccessService') as CheckModuleAccessService
	setCheckModuleAccessService(checkAccessService)
}

import { AppApiKeyController, registerAppApiKeyRoutes } from '@/Modules/AppApiKey'

/**
 * 註冊 AppApiKey 模組
 */
export const registerAppApiKey = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const controller = new AppApiKeyController(
		core.container.make('issueAppKeyService') as any,
		core.container.make('listAppKeysService') as any,
		core.container.make('rotateAppKeyService') as any,
		core.container.make('revokeAppKeyService') as any,
		core.container.make('setAppKeyScopeService') as any,
		core.container.make('getAppKeyUsageService') as any,
	)
	registerAppApiKeyRoutes(router, controller)
}

import { DevPortalController, registerDevPortalRoutes } from '@/Modules/DevPortal'

/**
 * 註冊 DevPortal 模組
 */
export const registerDevPortal = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const controller = new DevPortalController(
		core.container.make('registerAppService') as any,
		core.container.make('listAppsService') as any,
		core.container.make('manageAppKeysService') as any,
		core.container.make('configureWebhookService') as any,
		core.container.make('getApiDocsService') as any,
	)
	registerDevPortalRoutes(router, controller)
}

import {
	SdkApiController,
	registerSdkApiRoutes,
	AppAuthMiddleware,
} from '@/Modules/SdkApi'

/**
 * 註冊 SdkApi 模組（App API Key Bearer /sdk/v1）
 */
export const registerSdkApi = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const controller = new SdkApiController(
		core.container.make('proxyModelCall') as any,
		core.container.make('queryUsage') as any,
		core.container.make('queryBalance') as any,
	)
	const appAuthMiddleware = core.container.make('appAuthMiddleware') as AppAuthMiddleware
	registerSdkApiRoutes(router, controller, appAuthMiddleware)
}

import { CliApiController, registerCliApiRoutes } from '@/Modules/CliApi'

/**
 * 註冊 CliApi 模組
 */
export const registerCliApi = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const controller = new CliApiController(
		core.container.make('initiateDeviceFlowService') as any,
		core.container.make('authorizeDeviceService') as any,
		core.container.make('exchangeDeviceCodeService') as any,
		core.container.make('proxyCliRequestService') as any,
		core.container.make('revokeCliSessionService') as any,
	)
	registerCliApiRoutes(router, controller)
}
