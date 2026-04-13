/**
 * IAuthRouter - Auth Route Registration Interface (Framework Agnostic)
 *
 * The Auth module only depends on this interface to register routes, not on
 * PlanetCore or Gravito. The host implements this interface based on the
 * framework used (e.g., GravitoAuthRouter, ExpressAuthRouter). If the framework
 * changes in the future, only a new adapter needs to be implemented.
 */

import type { IHttpContext } from './IHttpContext'

export type AuthRouteHandler = (ctx: IHttpContext) => Promise<Response>

/**
 * Interface that allows the Auth module to register HTTP routes.
 *
 * - post / get: Public routes
 * - postWithGuard / getWithGuard: Routes requiring JWT verification
 *   (middleware applied by the adapter)
 */
export interface IAuthRouter {
  post(path: string, handler: AuthRouteHandler): void
  get(path: string, handler: AuthRouteHandler): void
  postWithGuard(path: string, handler: AuthRouteHandler): void
  getWithGuard(path: string, handler: AuthRouteHandler): void
}
