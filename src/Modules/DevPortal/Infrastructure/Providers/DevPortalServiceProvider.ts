import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IssueAppKeyService } from '@/Modules/AppApiKey/Application/Services/IssueAppKeyService'
import type { ListAppKeysService } from '@/Modules/AppApiKey/Application/Services/ListAppKeysService'
import type { RevokeAppKeyService } from '@/Modules/AppApiKey/Application/Services/RevokeAppKeyService'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { ConfigureWebhookService } from '../../Application/Services/ConfigureWebhookService'
import { GetApiDocsService } from '../../Application/Services/GetApiDocsService'
import { ListAppsService } from '../../Application/Services/ListAppsService'
import { ManageAppKeysService } from '../../Application/Services/ManageAppKeysService'
import { RegisterAppService } from '../../Application/Services/RegisterAppService'
import { ApplicationRepository } from '../Repositories/ApplicationRepository'
import { WebhookConfigRepository } from '../Repositories/WebhookConfigRepository'
import { DevPortalController } from '../../Presentation/Controllers/DevPortalController'
import { registerDevPortalRoutes } from '../../Presentation/Routes/devPortal.routes'

export class DevPortalServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.singleton('devPortalApplicationRepository', () => new ApplicationRepository(db))
    container.singleton('devPortalWebhookConfigRepository', () => new WebhookConfigRepository(db))
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind('registerAppService', (c: IContainer) => new RegisterAppService(
      c.make('devPortalApplicationRepository') as ApplicationRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('listAppsService', (c: IContainer) => new ListAppsService(
      c.make('devPortalApplicationRepository') as ApplicationRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('manageAppKeysService', (c: IContainer) => new ManageAppKeysService(
      c.make('devPortalApplicationRepository') as ApplicationRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('issueAppKeyService') as IssueAppKeyService,
      c.make('revokeAppKeyService') as RevokeAppKeyService,
      c.make('listAppKeysService') as ListAppKeysService,
    ))
    container.bind('configureWebhookService', (c: IContainer) => new ConfigureWebhookService(
      c.make('devPortalApplicationRepository') as ApplicationRepository,
      c.make('devPortalWebhookConfigRepository') as WebhookConfigRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('getApiDocsService', () => new GetApiDocsService())
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('devPortalController', (c: IContainer) => new DevPortalController(
      c.make('registerAppService') as RegisterAppService,
      c.make('listAppsService') as ListAppsService,
      c.make('manageAppKeysService') as ManageAppKeysService,
      c.make('configureWebhookService') as ConfigureWebhookService,
      c.make('getApiDocsService') as GetApiDocsService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('devPortalController') as DevPortalController
    registerDevPortalRoutes(context.router, controller)
  }

  override boot(_container: IContainer): void {
    console.log('🚀 [DevPortal] Module loaded')
  }
}
