import type { PlanetCore } from '@gravito/core'
import {
  registerHealth,
  registerAuth,
  registerProfile,
  registerOrganization,
  registerApiKey,
  registerDashboard,
  registerCredit,
  registerContract,
  registerAppModule,
  registerAppApiKey,
  registerDevPortal,
  registerSdkApi,
  registerCliApi,
  registerDocs,
} from './wiring'
import { registerPageRoutes } from './Pages/page-routes'

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
  registerPageRoutes(core)
  console.log('✅ Routes registered')
}
