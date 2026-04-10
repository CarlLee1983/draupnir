import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IAppApiKeyRepository } from '@/Modules/AppApiKey/Domain/Repositories/IAppApiKeyRepository'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { ICreditAccountRepository } from '@/Modules/Credit/Domain/Repositories/ICreditAccountRepository'
import type { BifrostClientConfig } from '@draupnir/bifrost-sdk'
import type { IKeyHashingService } from '@/Shared/Domain/Ports/IKeyHashingService'
import { AuthenticateApp } from '../../Application/UseCases/AuthenticateApp'
import { ProxyModelCall } from '../../Application/UseCases/ProxyModelCall'
import { QueryUsage } from '../../Application/UseCases/QueryUsage'
import { QueryBalance } from '../../Application/UseCases/QueryBalance'
import { AppAuthMiddleware } from '../Middleware/AppAuthMiddleware'

export class SdkApiServiceProvider extends ModuleServiceProvider {
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

  override boot(_context: unknown): void {
    console.log('🔌 [SdkApi] Module loaded')
  }
}
