import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { DevPortalController } from '../../Presentation/Controllers/DevPortalController'
import { registerDevPortalRoutes } from '../../Presentation/Routes/devPortal.routes'
import type { IWebhookDispatcher } from '@/Foundation/Infrastructure/Ports/IWebhookDispatcher'
import type { IssueAppKeyService } from '@/Modules/AppApiKey/Application/Services/IssueAppKeyService'
import type { ListAppKeysService } from '@/Modules/AppApiKey/Application/Services/ListAppKeysService'
import type { RevokeAppKeyService } from '@/Modules/AppApiKey/Application/Services/RevokeAppKeyService'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { ConfigureWebhookService } from '../../Application/Services/ConfigureWebhookService'
import { GetApiDocsService } from '../../Application/Services/GetApiDocsService'
import { ListAppsService } from '../../Application/Services/ListAppsService'
import { ManageAppKeysService } from '../../Application/Services/ManageAppKeysService'
import { RegisterAppService } from '../../Application/Services/RegisterAppService'
import { ApplicationRepository } from '../Repositories/ApplicationRepository'
import { WebhookConfigRepository } from '../Repositories/WebhookConfigRepository'

export class DevPortalServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('devPortalApplicationRepository', () => new ApplicationRepository(db))
    container.singleton('devPortalWebhookConfigRepository', () => new WebhookConfigRepository(db))
    container.singleton('devPortalWebhookDispatcher', (c: IContainer) => {
      return c.make('webhookDispatcher') as IWebhookDispatcher
    })

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

  registerRoutes(core: PlanetCore): void {
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

  override boot(_context: unknown): void {
    console.log('🚀 [DevPortal] Module loaded')
  }
}
