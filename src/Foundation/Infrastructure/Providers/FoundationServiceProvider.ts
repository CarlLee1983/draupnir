import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { BifrostClient } from '../Services/BifrostClient/BifrostClient'
import { createBifrostClientConfig } from '../Services/BifrostClient/BifrostClientConfig'
import { BifrostGatewayAdapter } from '../Services/LLMGateway/implementations/BifrostGatewayAdapter'

export class FoundationServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('bifrostClient', () => {
      const config = createBifrostClientConfig()
      return new BifrostClient(config)
    })
    container.singleton('llmGatewayClient', (c: IContainer) => {
      const bifrost = c.make('bifrostClient') as BifrostClient
      return new BifrostGatewayAdapter(bifrost)
    })
  }

  override boot(_context: any): void {
    console.log('🏗️  [Foundation] Module loaded')
  }
}
