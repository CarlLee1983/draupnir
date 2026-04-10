// src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { MemoryDeviceCodeStore } from '../Services/MemoryDeviceCodeStore'
import { InitiateDeviceFlowService } from '../../Application/Services/InitiateDeviceFlowService'
import { AuthorizeDeviceService } from '../../Application/Services/AuthorizeDeviceService'
import { ExchangeDeviceCodeService } from '../../Application/Services/ExchangeDeviceCodeService'
import { ProxyCliRequestService } from '../../Application/Services/ProxyCliRequestService'
import { RevokeCliSessionService } from '../../Application/Services/RevokeCliSessionService'
import type { ICliProxyClient } from '../../Application/Services/ProxyCliRequestService'
import type { JwtTokenService } from '@/Modules/Auth/Infrastructure/Services/JwtTokenService'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'

const CLI_VERIFICATION_URI = process.env.CLI_VERIFICATION_URI || 'http://localhost:3000/cli/verify'

export class CliApiServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('deviceCodeStore', () => new MemoryDeviceCodeStore())

    container.bind('initiateDeviceFlowService', (c: IContainer) => {
      return new InitiateDeviceFlowService(
        c.make('deviceCodeStore') as MemoryDeviceCodeStore,
        CLI_VERIFICATION_URI,
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

  override boot(_context: unknown): void {
    console.log('🖥️ [CliApi] Module loaded')
  }
}
