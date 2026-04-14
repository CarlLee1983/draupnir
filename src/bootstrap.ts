import { defineConfig, PlanetCore } from '@gravito/core'
import { SchemaCache, ZodValidator } from '@gravito/impulse'
import { OrbitPrism } from '@gravito/prism'
import { adaptGravitoContainer, createGravitoServiceProvider, isRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { buildConfig } from '../config/index'
import type { IJobRegistrar } from './Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar'
import type { IScheduler } from './Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import { FoundationServiceProvider } from './Foundation/Infrastructure/Providers/FoundationServiceProvider'
import { AlertsServiceProvider } from './Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider'
import { ApiKeyServiceProvider } from './Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider'
import { AppApiKeyServiceProvider } from './Modules/AppApiKey'
import type { EnsureCoreAppModulesService } from './Modules/AppModule/Application/Services/EnsureCoreAppModulesService'
import { AppModuleServiceProvider } from './Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider'
import { AuthServiceProvider } from './Modules/Auth/Infrastructure/Providers/AuthServiceProvider'
import { CliApiServiceProvider } from './Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider'
import { ContractServiceProvider } from './Modules/Contract/Infrastructure/Providers/ContractServiceProvider'
import { CreditServiceProvider } from './Modules/Credit/Infrastructure/Providers/CreditServiceProvider'
import { DashboardServiceProvider } from './Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider'
import { DevPortalServiceProvider } from './Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider'
import { HealthServiceProvider } from './Modules/Health/Infrastructure/Providers/HealthServiceProvider'
import { OrganizationServiceProvider } from './Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider'
import { ProfileServiceProvider } from './Modules/Profile/Infrastructure/Providers/ProfileServiceProvider'
import { ReportsServiceProvider } from './Modules/Reports/Infrastructure/Providers/ReportsServiceProvider'
import { SdkApiServiceProvider } from './Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider'
import { WebsiteServiceProvider } from './Website/bootstrap/WebsiteServiceProvider'
import { warmInertiaService } from './Website/Http/Inertia/createInertiaRequestHandler'
import { HttpKernel } from './Website/Http/HttpKernel'
import { registerGlobalMiddlewares } from './Website/Http/GravitoKernelAdapter'
import { setCurrentDatabaseAccess } from './wiring/CurrentDatabaseAccess'
import { DatabaseAccessBuilder } from './wiring/DatabaseAccessBuilder'
import { getCurrentORM } from './wiring/RepositoryFactory'
import { initializeRegistry } from './wiring/RepositoryRegistry'

function isJobRegistrar(value: unknown): value is IJobRegistrar {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as IJobRegistrar).registerJobs === 'function'
  )
}

export async function bootstrap(port = 3000): Promise<PlanetCore> {
  // 註冊表單驗證器
  SchemaCache.registerValidators([new ZodValidator()])

  const configObj = buildConfig(port)
  initializeRegistry()
  const db = new DatabaseAccessBuilder(getCurrentORM()).getDatabaseAccess()
  setCurrentDatabaseAccess(db)
  const config = defineConfig({ config: configObj })
  const core = new PlanetCore(config)

  // Register database service early
  core.container.singleton('database', () => db)

  await core.orbit(new OrbitPrism())

  const modules = [
    new HealthServiceProvider(),
    new FoundationServiceProvider(),
    new ProfileServiceProvider(),
    new AuthServiceProvider(),
    new OrganizationServiceProvider(),
    new ApiKeyServiceProvider(),
    new DashboardServiceProvider(),
    new AlertsServiceProvider(),
    new ReportsServiceProvider(),
    new CreditServiceProvider(),
    new ContractServiceProvider(),
    new AppModuleServiceProvider(),
    new AppApiKeyServiceProvider(),
    new DevPortalServiceProvider(),
    new SdkApiServiceProvider(),
    new CliApiServiceProvider(),
    new WebsiteServiceProvider(),
  ]

  for (const module of modules) {
    core.register(createGravitoServiceProvider(module))
  }

  await core.bootstrap()

  // ─── Global middleware ────────────────────────────────────────────────────
  // 順序由 HttpKernel.global() 定義，在此一行掛載全部。
  // 擴充 global middleware 請至 src/Website/Http/HttpKernel.ts。
  registerGlobalMiddlewares(core, HttpKernel.global())
  // ─────────────────────────────────────────────────────────────────────────

  await warmInertiaService()
  await (
    core.container.make('ensureCoreAppModulesService') as EnsureCoreAppModulesService
  ).execute()
  const routeContext: IRouteContext = {
    container: adaptGravitoContainer(core.container),
    router: createGravitoModuleRouter(core),
  }
  for (const module of modules) {
    if (isRouteRegistrar(module)) {
      await module.registerRoutes(routeContext)
    }
  }
  console.log('✅ Routes registered')

  const scheduler = core.container.make('scheduler') as IScheduler
  for (const module of modules) {
    if (isJobRegistrar(module)) {
      await module.registerJobs(scheduler)
    }
  }

  core.registerGlobalErrorHandlers()
  return core
}

export default bootstrap
