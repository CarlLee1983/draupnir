import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { SdkApiController } from '../../Presentation/Controllers/SdkApiController'
import { registerSdkApiRoutes } from '../../Presentation/Routes/sdkApi.routes'
import type { BifrostClientConfig } from '@draupnir/bifrost-sdk'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { IAppApiKeyRepository } from '@/Modules/AppApiKey/Domain/Repositories/IAppApiKeyRepository'
import type { ICreditAccountRepository } from '@/Modules/Credit/Domain/Repositories/ICreditAccountRepository'
import type { IKeyHashingService } from '@/Shared/Domain/Ports/IKeyHashingService'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { AuthenticateApp } from '../../Application/UseCases/AuthenticateApp'
import { ProxyModelCall } from '../../Application/UseCases/ProxyModelCall'
import { QueryBalance } from '../../Application/UseCases/QueryBalance'
import { QueryUsage } from '../../Application/UseCases/QueryUsage'
import { AppAuthMiddleware } from '../Middleware/AppAuthMiddleware'

export class SdkApiServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  override register(container: IContainer): void {
    container.singleton('authenticateApp', (c: IContainer) => {
      return new AuthenticateApp(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('keyHashingService') as IKeyHashingService,
      )
    })

    container.singleton('appAuthMiddleware', (c: IContainer) => {
      return new AppAuthMiddleware(c.make('authenticateApp') as AuthenticateApp)
    })

    container.bind('proxyModelCall', (c: IContainer) => {
      const config = c.make('bifrostConfig') as BifrostClientConfig
      return new ProxyModelCall(config.proxyBaseUrl)
    })

    container.bind('queryUsage', (c: IContainer) => {
      return new QueryUsage(c.make('llmGatewayClient') as ILLMGatewayClient)
    })

    container.bind('queryBalance', (c: IContainer) => {
      return new QueryBalance(c.make('creditAccountRepository') as ICreditAccountRepository)
    })
  }

  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new SdkApiController(
      core.container.make('proxyModelCall') as any,
      core.container.make('queryUsage') as any,
      core.container.make('queryBalance') as any,
    )
    const appAuthMiddleware = core.container.make('appAuthMiddleware') as AppAuthMiddleware
    registerSdkApiRoutes(router, controller, appAuthMiddleware)
  }

  override boot(_context: unknown): void {
    console.log('🔌 [SdkApi] Module loaded')
  }
}
