import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { ApiKeyRepository } from '../Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Services/ApiKeyBifrostSync'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { CreateApiKeyService } from '../../Application/Services/CreateApiKeyService'
import { ListApiKeysService } from '../../Application/Services/ListApiKeysService'
import { RevokeApiKeyService } from '../../Application/Services/RevokeApiKeyService'
import { UpdateKeyLabelService } from '../../Application/Services/UpdateKeyLabelService'
import { SetKeyPermissionsService } from '../../Application/Services/SetKeyPermissionsService'

export class ApiKeyServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('apiKeyRepository', () => new ApiKeyRepository(db))

    container.singleton('apiKeyBifrostSync', (c: IContainer) => {
      return new ApiKeyBifrostSync(c.make('llmGatewayClient') as ILLMGatewayClient)
    })

    container.singleton('keyHashingService', () => new KeyHashingService())

    container.bind('createApiKeyService', (c: IContainer) => {
      return new CreateApiKeyService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
        c.make('keyHashingService') as KeyHashingService,
      )
    })

    container.bind('listApiKeysService', (c: IContainer) => {
      return new ListApiKeysService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('revokeApiKeyService', (c: IContainer) => {
      return new RevokeApiKeyService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
      )
    })

    container.bind('updateKeyLabelService', (c: IContainer) => {
      return new UpdateKeyLabelService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('setKeyPermissionsService', (c: IContainer) => {
      return new SetKeyPermissionsService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
      )
    })
  }

  override boot(_context: unknown): void {
    console.log('🔑 [ApiKey] Module loaded')
  }
}
