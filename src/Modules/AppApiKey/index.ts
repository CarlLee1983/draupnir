/**
 * AppApiKey module public surface.
 *
 * Provides specialized API key management for system-to-system integrations,
 * including rotation policies and module-level permission bindings.
 */

export { GetAppKeyUsageService } from './Application/Services/GetAppKeyUsageService'
export { IssueAppKeyService } from './Application/Services/IssueAppKeyService'
export { ListAppKeysService } from './Application/Services/ListAppKeysService'
export { RevokeAppKeyService } from './Application/Services/RevokeAppKeyService'
export { RotateAppKeyService } from './Application/Services/RotateAppKeyService'
export { SetAppKeyScopeService } from './Application/Services/SetAppKeyScopeService'
export { AppApiKey } from './Domain/Aggregates/AppApiKey'
export type { IAppApiKeyRepository } from './Domain/Repositories/IAppApiKeyRepository'
export { AppKeyScope } from './Domain/ValueObjects/AppKeyScope'
export { BoundModules } from './Domain/ValueObjects/BoundModules'
export { KeyRotationPolicy } from './Domain/ValueObjects/KeyRotationPolicy'

export { AppApiKeyServiceProvider } from './Infrastructure/Providers/AppApiKeyServiceProvider'
export { AppKeyBifrostSync } from './Infrastructure/Services/AppKeyBifrostSync'

export { AppApiKeyController } from './Presentation/Controllers/AppApiKeyController'
export { registerAppApiKeyRoutes } from './Presentation/Routes/appApiKey.routes'
