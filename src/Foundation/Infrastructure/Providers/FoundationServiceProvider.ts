import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { BifrostClient } from '../Services/BifrostClient/BifrostClient'
import { createBifrostClientConfig } from '../Services/BifrostClient/BifrostClientConfig'

export class FoundationServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('bifrostClient', () => {
      const config = createBifrostClientConfig()
      return new BifrostClient(config)
    })
  }

  override boot(_context: any): void {
    console.log('🏗️  [Foundation] Module loaded')
  }
}
