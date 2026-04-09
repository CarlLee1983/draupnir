import { PlanetCore, defineConfig } from '@gravito/core'
import { OrbitPrism } from '@gravito/prism'
import { SchemaCache, ZodValidator } from '@gravito/impulse'
import { buildConfig } from '../config/index'
import { createGravitoServiceProvider } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { HealthServiceProvider } from './Modules/Health/Infrastructure/Providers/HealthServiceProvider'
import { FoundationServiceProvider } from './Foundation/Infrastructure/Providers/FoundationServiceProvider'
import { AuthServiceProvider } from './Modules/Auth/Infrastructure/Providers/AuthServiceProvider'
import { ProfileServiceProvider } from './Modules/Profile/Infrastructure/Providers/ProfileServiceProvider'
import { OrganizationServiceProvider } from './Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider'
import { ApiKeyServiceProvider } from './Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider'
import { DashboardServiceProvider } from './Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider'
import { CreditServiceProvider } from './Modules/Credit/Infrastructure/Providers/CreditServiceProvider'
import { ContractServiceProvider } from './Modules/Contract/Infrastructure/Providers/ContractServiceProvider'
import { AppModuleServiceProvider } from './Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider'
import { AppApiKeyServiceProvider } from './Modules/AppApiKey'
import { DevPortalServiceProvider } from './Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider'
import { SdkApiServiceProvider } from './Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider'
import { registerRoutes } from './routes'
import { initializeRegistry } from './wiring/RepositoryRegistry'
import { getCurrentORM } from './wiring/RepositoryFactory'
import { DatabaseAccessBuilder } from './wiring/DatabaseAccessBuilder'
import { setCurrentDatabaseAccess } from './wiring/CurrentDatabaseAccess'
import type { EnsureCoreAppModulesService } from './Modules/AppModule/Application/Services/EnsureCoreAppModulesService'

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

  await core.bootstrap()
  await (core.container.make('ensureCoreAppModulesService') as EnsureCoreAppModulesService).execute()
  await registerRoutes(core)
  core.registerGlobalErrorHandlers()
  return core
}

export default bootstrap
