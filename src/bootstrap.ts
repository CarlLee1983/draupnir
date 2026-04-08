import { PlanetCore, defineConfig } from '@gravito/core'
import { buildConfig } from '../config/index'
import { createGravitoServiceProvider } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { HealthServiceProvider } from './Modules/Health/Infrastructure/Providers/HealthServiceProvider'
import { FoundationServiceProvider } from './Foundation/Infrastructure/Providers/FoundationServiceProvider'
import { AuthServiceProvider } from './Modules/Auth/Infrastructure/Providers/AuthServiceProvider'
import { UserServiceProvider } from './Modules/User/Infrastructure/Providers/UserServiceProvider'
import { OrganizationServiceProvider } from './Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider'
import { registerRoutes } from './routes'
import { initializeRegistry } from './wiring/RepositoryRegistry'
import { getCurrentORM } from './wiring/RepositoryFactory'
import { DatabaseAccessBuilder } from './wiring/DatabaseAccessBuilder'
import { setCurrentDatabaseAccess } from './wiring/CurrentDatabaseAccess'

export async function bootstrap(port = 3000): Promise<PlanetCore> {
  const configObj = buildConfig(port)
  initializeRegistry()
  const db = new DatabaseAccessBuilder(getCurrentORM()).getDatabaseAccess()
  setCurrentDatabaseAccess(db)
  const config = defineConfig({ config: configObj })
  const core = new PlanetCore(config)

  core.register(createGravitoServiceProvider(new HealthServiceProvider()))
  core.register(createGravitoServiceProvider(new FoundationServiceProvider()))
  core.register(createGravitoServiceProvider(new UserServiceProvider()))
  core.register(createGravitoServiceProvider(new AuthServiceProvider()))
  core.register(createGravitoServiceProvider(new OrganizationServiceProvider()))

  await core.bootstrap()
  await registerRoutes(core)
  core.registerGlobalErrorHandlers()
  return core
}

export default bootstrap
