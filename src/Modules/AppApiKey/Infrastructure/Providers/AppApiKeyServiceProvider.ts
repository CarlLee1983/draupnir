import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { AppApiKeyController } from '../../Presentation/Controllers/AppApiKeyController'
import { registerAppApiKeyRoutes } from '../../Presentation/Routes/appApiKey.routes'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
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
import { AppApiKeyRepository } from '../Repositories/AppApiKeyRepository'
import { AppKeyBifrostSync } from '../Services/AppKeyBifrostSync'

export class AppApiKeyServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('appApiKeyRepository', () => new AppApiKeyRepository(db))

    container.singleton('appKeyBifrostSync', (c: IContainer) => {
      return new AppKeyBifrostSync(c.make('llmGatewayClient') as ILLMGatewayClient)
    })

    container.singleton('keyHashingService', () => new KeyHashingService())

    container.bind('issueAppKeyService', (c: IContainer) => {
      return new IssueAppKeyService(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('appKeyBifrostSync') as AppKeyBifrostSync,
        c.make('keyHashingService') as KeyHashingService,
      )
    })

    container.bind('listAppKeysService', (c: IContainer) => {
      return new ListAppKeysService(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('rotateAppKeyService', (c: IContainer) => {
      return new RotateAppKeyService(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('appKeyBifrostSync') as AppKeyBifrostSync,
        c.make('keyHashingService') as KeyHashingService,
      )
    })

    container.bind('revokeAppKeyService', (c: IContainer) => {
      return new RevokeAppKeyService(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('appKeyBifrostSync') as AppKeyBifrostSync,
      )
    })

    container.bind('setAppKeyScopeService', (c: IContainer) => {
      return new SetAppKeyScopeService(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('getAppKeyUsageService', (c: IContainer) => {
      return new GetAppKeyUsageService(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('llmGatewayClient') as ILLMGatewayClient,
      )
    })
  }

  registerRoutes(context: IRouteContext): void {
    const controller = new AppApiKeyController(
      context.container.make('issueAppKeyService') as any,
      context.container.make('listAppKeysService') as any,
      context.container.make('rotateAppKeyService') as any,
      context.container.make('revokeAppKeyService') as any,
      context.container.make('setAppKeyScopeService') as any,
      context.container.make('getAppKeyUsageService') as any,
    )
    registerAppApiKeyRoutes(context.router, controller)
  }

  override boot(_context: unknown): void {
    console.log('🔐 [AppApiKey] Module loaded')
  }
}
