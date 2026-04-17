/**
 * createApp
 *
 * Thin wrapper around the default `bootstrap` export from `./bootstrap` for `src/index.ts` (and
 * similar entrypoints).
 *
 * Responsibilities:
 * - Resolve listen **port** from `process.env.PORT` (fallback **3000**)
 * - Run the full async bootstrap sequence
 * - Return the initialized Gravito `PlanetCore` instance
 */

import type { PlanetCore } from '@gravito/core'
import bootstrap from './bootstrap'

/**
 * Creates and initializes the HTTP application core.
 *
 * @returns Configured `PlanetCore` after providers, routes, jobs, and global handlers are wired.
 */
export async function createApp(): Promise<PlanetCore> {
  const port = Number(process.env.PORT ?? 3000)
  const core = await bootstrap(port)
  return core
}
