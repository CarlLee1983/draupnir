// src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts

import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { CliApiController } from '../../Presentation/Controllers/CliApiController'
import { registerCliApiRoutes } from '../../Presentation/Routes/cliApi.routes'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import type { JwtTokenService } from '@/Modules/Auth/Infrastructure/Services/JwtTokenService'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { AuthorizeDeviceService } from '../../Application/Services/AuthorizeDeviceService'
import { ExchangeDeviceCodeService } from '../../Application/Services/ExchangeDeviceCodeService'
import { InitiateDeviceFlowService } from '../../Application/Services/InitiateDeviceFlowService'
import type { ICliProxyClient } from '../../Application/Services/ProxyCliRequestService'
import { ProxyCliRequestService } from '../../Application/Services/ProxyCliRequestService'
import { RevokeCliSessionService } from '../../Application/Services/RevokeCliSessionService'
import { loadCliApiConfig } from '../Config/CliApiConfig'
import { MemoryDeviceCodeStore } from '../Services/MemoryDeviceCodeStore'

export class CliApiServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  override register(container: IContainer): void {
    const cliApiConfig = loadCliApiConfig()
    container.singleton('cliApiConfig', () => cliApiConfig)

    container.singleton('deviceCodeStore', () => new MemoryDeviceCodeStore())

    container.bind('initiateDeviceFlowService', (c: IContainer) => {
      return new InitiateDeviceFlowService(
        c.make('deviceCodeStore') as MemoryDeviceCodeStore,
        cliApiConfig.verificationUri,
        cliApiConfig.deviceCodeTtlSeconds,
        cliApiConfig.pollingIntervalSeconds,
      )
    })

    container.bind('authorizeDeviceService', (c: IContainer) => {
      return new AuthorizeDeviceService(c.make('deviceCodeStore') as MemoryDeviceCodeStore)
    })

    container.bind('exchangeDeviceCodeService', (c: IContainer) => {
      return new ExchangeDeviceCodeService(
        c.make('deviceCodeStore') as MemoryDeviceCodeStore,
        c.make('jwtTokenService') as JwtTokenService,
        c.make('authTokenRepository') as IAuthTokenRepository,
      )
    })

    container.bind('proxyCliRequestService', (c: IContainer) => {
      const bifrostClient = c.make('bifrostClient') as ICliProxyClient
      return new ProxyCliRequestService(bifrostClient)
    })

    container.bind('revokeCliSessionService', (c: IContainer) => {
      return new RevokeCliSessionService(c.make('authTokenRepository') as IAuthTokenRepository)
    })
  }

  registerRoutes(context: IRouteContext): void {
    const controller = new CliApiController(
      context.container.make('initiateDeviceFlowService') as any,
      context.container.make('authorizeDeviceService') as any,
      context.container.make('exchangeDeviceCodeService') as any,
      context.container.make('proxyCliRequestService') as any,
      context.container.make('revokeCliSessionService') as any,
    )
    registerCliApiRoutes(context.router, controller)
  }

  override boot(_context: unknown): void {
    console.log('🖥️ [CliApi] Module loaded')
  }
}
