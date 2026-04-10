import type { PlanetCore } from '@gravito/core'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { registerPageRoutes } from './Pages/page-routes'
import {
  registerApiKey,
  registerAppApiKey,
  registerAppModule,
  registerAuth,
  registerCliApi,
  registerContract,
  registerCredit,
  registerDashboard,
  registerDevPortal,
  registerDocs,
  registerHealth,
  registerOrganization,
  registerProfile,
  registerSdkApi,
} from './wiring'

export async function registerRoutes(core: PlanetCore) {
  core.router.get('/api', async (ctx) => {
    return ctx.json({
      success: true,
      message: 'Draupnir API',
      version: '0.1.0',
    })
  })

  registerHealth(core)
  registerAuth(core)
  registerProfile(core)
  registerOrganization(core)
  registerContract(core)
  registerAppModule(core)
  registerAppApiKey(core)
  registerDevPortal(core)
  registerApiKey(core)
  registerDashboard(core)
  registerCredit(core)
  registerSdkApi(core)
  registerCliApi(core)
  await registerDocs(core)
  registerPageRoutes(createGravitoModuleRouter(core), core.container as IContainer)
  console.log('✅ Routes registered')
}
