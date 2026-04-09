import type { PlanetCore } from '@gravito/core'
import {
  registerHealth,
  registerAuth,
  registerUser,
  registerOrganization,
  registerApiKey,
  registerDashboard,
  registerCredit,
  registerContract,
  registerAppModule,
  registerAppApiKey,
  registerDevPortal,
  registerDocs,
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
  registerUser(core)
  registerOrganization(core)
  registerContract(core)
  registerAppModule(core)
  registerAppApiKey(core)
  registerDevPortal(core)
  registerApiKey(core)
  registerDashboard(core)
  registerCredit(core)
  await registerDocs(core)
  console.log('✅ Routes registered')
}
