import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { GetAppKeyUsageService } from '../../Application/Services/GetAppKeyUsageService'
import { IssueAppKeyService } from '../../Application/Services/IssueAppKeyService'
import { ListAppKeysService } from '../../Application/Services/ListAppKeysService'
import { RevokeAppKeyService } from '../../Application/Services/RevokeAppKeyService'
import { RotateAppKeyService } from '../../Application/Services/RotateAppKeyService'
import { SetAppKeyScopeService } from '../../Application/Services/SetAppKeyScopeService'
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import { AppApiKeyController } from '../../Presentation/Controllers/AppApiKeyController'
import { registerAppApiKeyRoutes } from '../../Presentation/Routes/appApiKey.routes'
import { AppApiKeyRepository } from '../Repositories/AppApiKeyRepository'
import { AppKeyBifrostSync } from '../Services/AppKeyBifrostSync'

export class AppApiKeyServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    container.singleton(
      'appApiKeyRepository',
      () => new AppApiKeyRepository(getCurrentDatabaseAccess()),
    )
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton(
      'appKeyBifrostSync',
      (c: IContainer) => new AppKeyBifrostSync(c.make('llmGatewayClient') as ILLMGatewayClient),
    )
    container.singleton('keyHashingService', () => new KeyHashingService())
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind(
      'issueAppKeyService',
      (c: IContainer) =>
        new IssueAppKeyService(
          c.make('appApiKeyRepository') as IAppApiKeyRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
          c.make('appKeyBifrostSync') as AppKeyBifrostSync,
          c.make('keyHashingService') as KeyHashingService,
        ),
    )
    container.bind(
      'listAppKeysService',
      (c: IContainer) =>
        new ListAppKeysService(
          c.make('appApiKeyRepository') as IAppApiKeyRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        ),
    )
    container.bind(
      'rotateAppKeyService',
      (c: IContainer) =>
        new RotateAppKeyService(
          c.make('appApiKeyRepository') as IAppApiKeyRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
          c.make('appKeyBifrostSync') as AppKeyBifrostSync,
          c.make('keyHashingService') as KeyHashingService,
        ),
    )
    container.bind(
      'revokeAppKeyService',
      (c: IContainer) =>
        new RevokeAppKeyService(
          c.make('appApiKeyRepository') as IAppApiKeyRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
          c.make('appKeyBifrostSync') as AppKeyBifrostSync,
        ),
    )
    container.bind(
      'setAppKeyScopeService',
      (c: IContainer) =>
        new SetAppKeyScopeService(
          c.make('appApiKeyRepository') as IAppApiKeyRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        ),
    )
    container.bind(
      'getAppKeyUsageService',
      (c: IContainer) =>
        new GetAppKeyUsageService(
          c.make('appApiKeyRepository') as IAppApiKeyRepository,
          c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
          c.make('llmGatewayClient') as ILLMGatewayClient,
        ),
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind(
      'appApiKeyController',
      (c: IContainer) =>
        new AppApiKeyController(
          c.make('issueAppKeyService') as IssueAppKeyService,
          c.make('listAppKeysService') as ListAppKeysService,
          c.make('rotateAppKeyService') as RotateAppKeyService,
          c.make('revokeAppKeyService') as RevokeAppKeyService,
          c.make('setAppKeyScopeService') as SetAppKeyScopeService,
          c.make('getAppKeyUsageService') as GetAppKeyUsageService,
        ),
    )
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('appApiKeyController') as AppApiKeyController
    registerAppApiKeyRoutes(context.router, controller)
  }

  override boot(_container: IContainer): void {
    console.log('🔐 [AppApiKey] Module loaded')
  }
}
