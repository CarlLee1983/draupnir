import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { ApplicationRepository } from '../Repositories/ApplicationRepository'
import { WebhookConfigRepository } from '../Repositories/WebhookConfigRepository'
import { WebhookDispatcher } from '../Services/WebhookDispatcher'
import { RegisterAppService } from '../../Application/Services/RegisterAppService'
import { ListAppsService } from '../../Application/Services/ListAppsService'
import { ManageAppKeysService } from '../../Application/Services/ManageAppKeysService'
import { ConfigureWebhookService } from '../../Application/Services/ConfigureWebhookService'
import { GetApiDocsService } from '../../Application/Services/GetApiDocsService'
import type { IssueAppKeyService } from '@/Modules/AppApiKey/Application/Services/IssueAppKeyService'
import type { ListAppKeysService } from '@/Modules/AppApiKey/Application/Services/ListAppKeysService'
import type { RevokeAppKeyService } from '@/Modules/AppApiKey/Application/Services/RevokeAppKeyService'

export class DevPortalServiceProvider extends ModuleServiceProvider {
	override register(container: IContainer): void {
		const db = getCurrentDatabaseAccess()

		container.singleton('devPortalApplicationRepository', () => new ApplicationRepository(db))
		container.singleton('devPortalWebhookConfigRepository', () => new WebhookConfigRepository(db))
		container.singleton('devPortalWebhookDispatcher', () => new WebhookDispatcher())

		container.bind('registerAppService', (c: IContainer) => {
			return new RegisterAppService(
				c.make('devPortalApplicationRepository') as ApplicationRepository,
				c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
			)
		})

		container.bind('listAppsService', (c: IContainer) => {
			return new ListAppsService(
				c.make('devPortalApplicationRepository') as ApplicationRepository,
				c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
			)
		})

		container.bind('manageAppKeysService', (c: IContainer) => {
			return new ManageAppKeysService(
				c.make('devPortalApplicationRepository') as ApplicationRepository,
				c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
				c.make('issueAppKeyService') as IssueAppKeyService,
				c.make('revokeAppKeyService') as RevokeAppKeyService,
				c.make('listAppKeysService') as ListAppKeysService,
			)
		})

		container.bind('configureWebhookService', (c: IContainer) => {
			return new ConfigureWebhookService(
				c.make('devPortalApplicationRepository') as ApplicationRepository,
				c.make('devPortalWebhookConfigRepository') as WebhookConfigRepository,
				c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
			)
		})

		container.bind('getApiDocsService', () => {
			return new GetApiDocsService()
		})
	}

	override boot(_context: unknown): void {
		console.log('🚀 [DevPortal] Module loaded')
	}
}
