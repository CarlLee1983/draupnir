import { defineConfig, PlanetCore } from '@gravito/core'
import { SchemaCache, ZodValidator } from '@gravito/impulse'
import { OrbitPrism } from '@gravito/prism'
import { createGravitoServiceProvider } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { buildConfig } from '../config/index'
import { FoundationServiceProvider } from './Foundation/Infrastructure/Providers/FoundationServiceProvider'
import { ApiKeyServiceProvider } from './Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider'
import { AppApiKeyServiceProvider } from './Modules/AppApiKey'
import type { EnsureCoreAppModulesService } from './Modules/AppModule/Application/Services/EnsureCoreAppModulesService'
import { AppModuleServiceProvider } from './Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider'
import { AuthServiceProvider } from './Modules/Auth/Infrastructure/Providers/AuthServiceProvider'
import { CliApiServiceProvider } from './Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider'
import { ContractServiceProvider } from './Modules/Contract/Infrastructure/Providers/ContractServiceProvider'
import { CreditServiceProvider } from './Modules/Credit/Infrastructure/Providers/CreditServiceProvider'
import { DashboardServiceProvider } from './Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider'
import { BifrostSyncService } from './Modules/Dashboard/Infrastructure/Services/BifrostSyncService'
import { DevPortalServiceProvider } from './Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider'
import { HealthServiceProvider } from './Modules/Health/Infrastructure/Providers/HealthServiceProvider'
import { OrganizationServiceProvider } from './Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider'
import { ProfileServiceProvider } from './Modules/Profile/Infrastructure/Providers/ProfileServiceProvider'
import { SdkApiServiceProvider } from './Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider'
import { PagesServiceProvider } from './Pages/Infrastructure/Providers/PagesServiceProvider'
import { warmInertiaService } from './Pages/routing/inertiaFactory'
import { registerRoutes } from './routes'
import { setCurrentDatabaseAccess } from './wiring/CurrentDatabaseAccess'
import { DatabaseAccessBuilder } from './wiring/DatabaseAccessBuilder'
import { getCurrentORM } from './wiring/RepositoryFactory'
import { initializeRegistry } from './wiring/RepositoryRegistry'

export async function bootstrap(port = 3000): Promise<PlanetCore> {
  // 註冊表單驗證器
  SchemaCache.registerValidators([new ZodValidator()])

  const configObj = buildConfig(port)
  initializeRegistry()
  const db = new DatabaseAccessBuilder(getCurrentORM()).getDatabaseAccess()
  setCurrentDatabaseAccess(db)
  const config = defineConfig({ config: configObj })
  const core = new PlanetCore(config)
  await core.orbit(new OrbitPrism())

  core.register(createGravitoServiceProvider(new HealthServiceProvider()))
  core.register(createGravitoServiceProvider(new FoundationServiceProvider()))
  core.register(createGravitoServiceProvider(new ProfileServiceProvider()))
  core.register(createGravitoServiceProvider(new AuthServiceProvider()))
  core.register(createGravitoServiceProvider(new OrganizationServiceProvider()))
  core.register(createGravitoServiceProvider(new ApiKeyServiceProvider()))
  core.register(createGravitoServiceProvider(new DashboardServiceProvider()))
  core.register(createGravitoServiceProvider(new CreditServiceProvider()))
  core.register(createGravitoServiceProvider(new ContractServiceProvider()))
  core.register(createGravitoServiceProvider(new AppModuleServiceProvider()))
  core.register(createGravitoServiceProvider(new AppApiKeyServiceProvider()))
  core.register(createGravitoServiceProvider(new DevPortalServiceProvider()))
  core.register(createGravitoServiceProvider(new SdkApiServiceProvider()))
  core.register(createGravitoServiceProvider(new CliApiServiceProvider()))
  core.register(createGravitoServiceProvider(new PagesServiceProvider()))

  await core.bootstrap()
  await warmInertiaService()
  await (
    core.container.make('ensureCoreAppModulesService') as EnsureCoreAppModulesService
  ).execute()
  await registerRoutes(core)
  // --- BifrostSyncService scheduler ---
  // Must be after core.bootstrap() so DI container is fully initialized.
  // Per RESEARCH.md anti-pattern warning: never register timer in ServiceProvider.boot().
  const syncService = core.container.make('bifrostSyncService') as BifrostSyncService
  const SYNC_INTERVAL_MS = Number(process.env.BIFROST_SYNC_INTERVAL_MS ?? 5 * 60 * 1000)

  // Run once at startup to populate initial data
  syncService.sync().catch((err) => {
    console.error('[BifrostSync] Initial sync failed (non-fatal):', err)
  })

  // Then on interval
  setInterval(() => {
    syncService.sync().then((result) => {
      console.error(`[BifrostSync] Synced ${result.synced} records, quarantined ${result.quarantined}`)
    }).catch((err) => {
      console.error('[BifrostSync] Sync error (dashboard serves stale data):', err)
      // DO NOT rethrow — server must not crash on sync failure
    })
  }, SYNC_INTERVAL_MS)
  // --- End BifrostSyncService scheduler ---

  core.registerGlobalErrorHandlers()
  return core
}

export default bootstrap
