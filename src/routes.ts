import type { PlanetCore } from '@gravito/core'
import { registerHealth, registerAuth, registerUser, registerOrganization, registerDocs } from './wiring'

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
  await registerDocs(core)
  console.log('✅ Routes registered')
}
