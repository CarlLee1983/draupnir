import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import type { JwtTokenService } from '@/Modules/Auth/Infrastructure/Services/JwtTokenService'
import type { IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { AuthorizeDeviceService } from '../../Application/Services/AuthorizeDeviceService'
import { ExchangeDeviceCodeService } from '../../Application/Services/ExchangeDeviceCodeService'
import { InitiateDeviceFlowService } from '../../Application/Services/InitiateDeviceFlowService'
import type { ICliProxyClient } from '../../Application/Services/ProxyCliRequestService'
import { ProxyCliRequestService } from '../../Application/Services/ProxyCliRequestService'
import { RevokeCliSessionService } from '../../Application/Services/RevokeCliSessionService'
import { CliApiController } from '../../Presentation/Controllers/CliApiController'
import { registerCliApiRoutes } from '../../Presentation/Routes/cliApi.routes'
import { loadCliApiConfig } from '../Config/CliApiConfig'
import { MemoryDeviceCodeStore } from '../Services/MemoryDeviceCodeStore'

export class CliApiServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerInfraServices(container: IContainer): void {
    const cliApiConfig = loadCliApiConfig()
    container.singleton('cliApiConfig', () => cliApiConfig)
    container.singleton('deviceCodeStore', () => new MemoryDeviceCodeStore())
  }

  protected override registerApplicationServices(container: IContainer): void {
    const cliApiConfig = loadCliApiConfig()
    container.bind(
      'initiateDeviceFlowService',
      (c: IContainer) =>
        new InitiateDeviceFlowService(
          c.make('deviceCodeStore') as MemoryDeviceCodeStore,
          cliApiConfig.verificationUri,
          cliApiConfig.deviceCodeTtlSeconds,
          cliApiConfig.pollingIntervalSeconds,
        ),
    )
    container.bind(
      'authorizeDeviceService',
      (c: IContainer) =>
        new AuthorizeDeviceService(c.make('deviceCodeStore') as MemoryDeviceCodeStore),
    )
    container.bind(
      'exchangeDeviceCodeService',
      (c: IContainer) =>
        new ExchangeDeviceCodeService(
          c.make('deviceCodeStore') as MemoryDeviceCodeStore,
          c.make('jwtTokenService') as JwtTokenService,
          c.make('authTokenRepository') as IAuthTokenRepository,
        ),
    )
    container.bind(
      'proxyCliRequestService',
      (c: IContainer) => new ProxyCliRequestService(c.make('bifrostClient') as ICliProxyClient),
    )
    container.bind(
      'revokeCliSessionService',
      (c: IContainer) =>
        new RevokeCliSessionService(c.make('authTokenRepository') as IAuthTokenRepository),
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind(
      'cliApiController',
      (c: IContainer) =>
        new CliApiController(
          c.make('initiateDeviceFlowService') as InitiateDeviceFlowService,
          c.make('authorizeDeviceService') as AuthorizeDeviceService,
          c.make('exchangeDeviceCodeService') as ExchangeDeviceCodeService,
          c.make('proxyCliRequestService') as ProxyCliRequestService,
          c.make('revokeCliSessionService') as RevokeCliSessionService,
        ),
    )
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('cliApiController') as CliApiController
    registerCliApiRoutes(context.router, controller)
  }

  override boot(_container: IContainer): void {
    console.log('🖥️ [CliApi] Module loaded')
  }
}
