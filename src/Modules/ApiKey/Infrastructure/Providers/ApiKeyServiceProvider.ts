import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import { AssignApiKeyService } from '../../Application/Services/AssignApiKeyService'
import { CreateApiKeyService } from '../../Application/Services/CreateApiKeyService'
import { ListApiKeysService } from '../../Application/Services/ListApiKeysService'
import { RevokeApiKeyService } from '../../Application/Services/RevokeApiKeyService'
import { SetKeyPermissionsService } from '../../Application/Services/SetKeyPermissionsService'
import { UpdateApiKeyBudgetService } from '../../Application/Services/UpdateApiKeyBudgetService'
import { UpdateKeyLabelService } from '../../Application/Services/UpdateKeyLabelService'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import { ApiKeyRepository } from '../Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Services/ApiKeyBifrostSync'
import { ApiKeyController } from '../../Presentation/Controllers/ApiKeyController'
import { registerApiKeyRoutes } from '../../Presentation/Routes/apikey.routes'

export class ApiKeyServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    container.singleton('apiKeyRepository', () => new ApiKeyRepository(getCurrentDatabaseAccess()))
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('apiKeyBifrostSync', (c: IContainer) =>
      new ApiKeyBifrostSync(c.make('llmGatewayClient') as ILLMGatewayClient)
    )
    container.singleton('keyHashingService', () => new KeyHashingService())
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind('assignApiKeyService', (c: IContainer) => new AssignApiKeyService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('createApiKeyService', (c: IContainer) => new CreateApiKeyService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
      c.make('keyHashingService') as KeyHashingService,
    ))
    container.bind('listApiKeysService', (c: IContainer) => new ListApiKeysService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('revokeApiKeyService', (c: IContainer) => new RevokeApiKeyService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
    ))
    container.bind('updateKeyLabelService', (c: IContainer) => new UpdateKeyLabelService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('setKeyPermissionsService', (c: IContainer) => new SetKeyPermissionsService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
    ))
    container.bind('updateApiKeyBudgetService', (c: IContainer) => new UpdateApiKeyBudgetService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
    ))
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('apiKeyController', (c: IContainer) => new ApiKeyController(
      c.make('createApiKeyService') as CreateApiKeyService,
      c.make('listApiKeysService') as ListApiKeysService,
      c.make('revokeApiKeyService') as RevokeApiKeyService,
      c.make('updateKeyLabelService') as UpdateKeyLabelService,
      c.make('setKeyPermissionsService') as SetKeyPermissionsService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('apiKeyController') as ApiKeyController
    registerApiKeyRoutes(context.router, controller)
  }

  override boot(_container: IContainer): void {
    console.log('🔑 [ApiKey] Module loaded')
  }
}
