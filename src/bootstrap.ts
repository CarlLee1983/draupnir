/**
 * bootstrap
 *
 * Application entry: constructs Gravito `PlanetCore`, registers all module service providers,
 * mounts global HTTP middleware, warms the Inertia presentation layer, registers HTTP routes,
 * wires scheduled jobs, and attaches global error handlers.
 *
 * Responsibilities:
 * - Configure Impulse validators, ORM (when enabled), repository registry, and shared DB access
 * - Register providers in a fixed order, then `core.bootstrap()` for DI and lifecycle hooks
 * - Apply `HttpKernel.global()` middleware and await `warmInertiaService()` before any Inertia page
 *   resolves from the container
 * - Run `ensureCoreAppModulesService` after bootstrap, then `registerRoutes` / `registerJobs`
 *
 * Implementation note: route registration runs after Inertia warming because `WebsiteServiceProvider`
 * resolves page singletons that depend on `inertiaService`. Job registration requires `scheduler`
 * from `FoundationServiceProvider`.
 */

import { DB } from '@gravito/atlas'
import { defineConfig, PlanetCore } from '@gravito/core'
import { SchemaCache, ZodValidator } from '@gravito/impulse'
import { OrbitPrism } from '@gravito/prism'
import { adaptGravitoContainer, createGravitoServiceProvider, isRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import databaseConfig from '../config/database'
import { buildConfig, useDatabase } from '../config/index'
import type { IJobRegistrar } from './Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar'
import type { IScheduler } from './Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import type { IQueueRegistrar } from './Foundation/Infrastructure/Ports/Queue/IQueueRegistrar'
import type { IQueue } from './Foundation/Infrastructure/Ports/Queue/IQueue'
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
import { setCurrentContainer } from './wiring/CurrentContainer'
import { setCurrentDatabaseAccess } from './wiring/CurrentDatabaseAccess'
import { DatabaseAccessBuilder } from './wiring/DatabaseAccessBuilder'
import { getCurrentORM } from './wiring/RepositoryFactory'
import { initializeRegistry } from './wiring/RepositoryRegistry'

/**
 * Narrows an unknown module instance to {@link IJobRegistrar} when it exposes `registerJobs`.
 *
 * @param value - Provider instance after `core.bootstrap()` (typically a service provider).
 * @returns True when `value` is a non-null object with a callable `registerJobs` method.
 */
function isJobRegistrar(value: unknown): value is IJobRegistrar {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as IJobRegistrar).registerJobs === 'function'
  )
}

/**
 * Narrows an unknown module instance to {@link IQueueRegistrar}.
 */
function isQueueRegistrar(value: unknown): value is IQueueRegistrar {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as IQueueRegistrar).registerQueueHandlers === 'function'
  )
}

/**
 * Boots the HTTP application: DI container, middleware, Inertia, routes, and scheduler jobs.
 *
 * @param port - HTTP listen port forwarded into `buildConfig` (default **3000**).
 * @returns A fully configured `PlanetCore` ready to listen; does not call `listen()` itself.
 */
export async function bootstrap(port = 3000): Promise<PlanetCore> {
  SchemaCache.registerValidators([new ZodValidator()])

  const configObj = buildConfig(port)
  const orm = getCurrentORM()
  if (orm === 'atlas' && useDatabase) {
    DB.configure(databaseConfig)
  }
  initializeRegistry()
  const db = new DatabaseAccessBuilder(orm).getDatabaseAccess()
  setCurrentDatabaseAccess(db)
  const config = defineConfig({ config: configObj })
  const core = new PlanetCore(config)

  const adaptedContainer = adaptGravitoContainer(core.container)
  setCurrentContainer(adaptedContainer)

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

  // Order is defined by HttpKernel.global(); add new global middleware in HttpKernel.ts.
  registerGlobalMiddlewares(core, HttpKernel.global())

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

  const queue = core.container.make('queue') as IQueue
  for (const module of modules) {
    if (isQueueRegistrar(module)) {
      await module.registerQueueHandlers(queue)
    }
  }

  core.registerGlobalErrorHandlers()
  return core
}

/** Default export; same callable as {@link bootstrap}. */
export default bootstrap
