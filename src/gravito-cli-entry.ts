/**
 * Bootstrap-only entry for @gravito/pulse CLI (e.g. `gravito route:list`).
 *
 * Default `src/index.ts` starts `Bun.serve` and exports nothing, so Pulse cannot resolve
 * `core`. Gravito 3.x exposes `PlanetCore.app` as `BunNativeAdapter`, which is not
 * Photon-shaped; Pulse expects `{ routes: { method, path, name? }[] }`, so we adapt from
 * `router.compile()`.
 */
import { createApp } from './app'

const planetCore = await createApp()
const routes = planetCore.router.compile()

export const core = {
  router: {
    /** Pulse calls `exportNamedRoutes()` unbound; delegate with correct `this`. */
    exportNamedRoutes: () => planetCore.router.exportNamedRoutes(),
  },
  app: { routes },
}

export default { core }
