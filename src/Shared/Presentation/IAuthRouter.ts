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
  /**
   * Registers a public POST route.
   *
   * @param path - The route path.
   * @param handler - The async function to handle the request.
   */
  post(path: string, handler: AuthRouteHandler): void

  /**
   * Registers a public GET route.
   *
   * @param path - The route path.
   * @param handler - The async function to handle the request.
   */
  get(path: string, handler: AuthRouteHandler): void

  /**
   * Registers a protected POST route requiring JWT authentication.
   *
   * @param path - The route path.
   * @param handler - The async function to handle the request.
   */
  postWithGuard(path: string, handler: AuthRouteHandler): void

  /**
   * Registers a protected GET route requiring JWT authentication.
   *
   * @param path - The route path.
   * @param handler - The async function to handle the request.
   */
  getWithGuard(path: string, handler: AuthRouteHandler): void
}
