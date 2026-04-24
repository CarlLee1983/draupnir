/**
 * AppModule public surface.
 *
 * Manages the registry of system capabilities and organization-level 
 * subscriptions to these capabilities.
 */

// Application Services
export { SubscribeModuleService } from './Application/Services/SubscribeModuleService'
export { CheckModuleAccessService } from './Application/Services/CheckModuleAccessService'

// Domain
export { AppModule } from './Domain/Aggregates/AppModule'
export { ModuleSubscription } from './Domain/Entities/ModuleSubscription'
export type { IAppModuleRepository } from './Domain/Repositories/IAppModuleRepository'

// Infrastructure
export { AppModuleServiceProvider } from './Infrastructure/Providers/AppModuleServiceProvider'

// Presentation
export { AppModuleController } from './Presentation/Controllers/AppModuleController'
export { registerAppModuleRoutes } from './Presentation/Routes/appModule.routes'
