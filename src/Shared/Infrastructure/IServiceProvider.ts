/**
 * Dependency Injection Container - Framework Agnostic Interface
 *
 * @public - Public interface usable by all layers.
 *
 * Defines the registration and resolution mechanisms for dependency injection,
 * hiding the specific container implementation of the framework (Gravito, Nest, Express, etc.).
 *
 * **Design Principles**
 * - Completely framework-agnostic: Does not depend on any specific DI framework.
 * - Supports two lifecycles: Singleton (shared application-wide) and Factory (new instance each time).
 * - Follows the Dependency Injection pattern: All services are resolved through the container.
 *
 * @design
 * - If the framework is upgraded or replaced, only a new IContainer adapter needs to be implemented.
 * - Modules and Services are unaware of the specific container being used.
 *
 * @example
 * ```typescript
 * // Registering services in a Module
 * export class UserServiceProvider extends ModuleServiceProvider {
 *   register(container: IContainer) {
 *     container.singleton('UserRepository', (c) => new UserRepository(c.make('db')))
 *     container.singleton('UserService', (c) => new UserService(c.make('UserRepository')))
 *   }
 * }
 *
 * // Usage in the application layer
 * const userService = container.make('UserService')
 * ```
 */
export interface IContainer {
  /**
   * Registers a singleton service (shared application-wide).
   *
   * Suitable for: Database connections, Loggers, Config, and other heavyweight, stateless services.
   *
   * @param name - Service registration name.
   * @param factory - Factory function that receives the container and returns the service instance.
   */
  singleton(name: string, factory: (container: IContainer) => any): void

  /**
   * Registers a factory service (creates a new instance every time it is resolved).
   *
   * Suitable for: Request Handlers, Controllers, and other stateful services.
   *
   * @param name - Service registration name.
   * @param factory - Factory function, executed every time make() is called.
   */
  bind(name: string, factory: (container: IContainer) => any): void

  /**
   * Resolves a service from the container.
   *
   * @param name - Service registration name.
   * @returns The resolved service instance.
   * @throws Should throw a clear error message if the service is not registered.
   */
  make(name: string): any
}

/**
 * Service Provider Base Class (Framework Agnostic)
 *
 * @public - All Modules should extend this class to define their service providers.
 *
 * Modules should inherit from this class rather than directly from framework-specific ServiceProviders.
 * The framework adaptation layer is responsible for adapting this class to the specific framework's
 * ServiceProvider format (e.g., Nest.js's @Injectable).
 *
 * **Responsibilities**
 * - `register()`: Defines the services provided by this module (Repository, Service, Controller).
 * - `boot()`: Optional, executes initialization logic when the application starts.
 *
 * **Design Principles**
 * - Completely framework-agnostic: Only uses the IContainer interface.
 * - Hides framework details: Framework Adapter is responsible for converting this class into a framework-specific format.
 *
 * @example
 * ```typescript
 * // Domain Layer
 * export interface IUserRepository extends IRepository<User> {
 *   findByEmail(email: string): Promise<User | null>
 * }
 *
 * // Infrastructure Layer
 * export class UserServiceProvider extends ModuleServiceProvider {
 *   register(container: IContainer): void {
 *     // Register Repository (automatically using IDatabaseAccess)
 *     container.singleton(
 *       'UserRepository',
 *       (c) => new UserRepository(c.make('db'))
 *     )
 *
 *     // Register Service
 *     container.singleton(
 *       'UserService',
 *       (c) => new UserService(c.make('UserRepository'))
 *     )
 *   }
 *
 *   boot(_context: any): void {
 *     // Initialization logic when application starts (optional)
 *   }
 * }
 *
 * // Wiring Layer (Framework Adapter)
 * export function registerUserModule(core: PlanetCore): void {
 *   const provider = new UserServiceProvider()
 *   provider.register(core.container)
 *   provider.boot(core)
 * }
 * ```
 */
export abstract class ModuleServiceProvider {
  /**
   * Registers services into the container.
   *
   * This method is called during application startup where the module defines all provided services.
   *
   * @param container - Framework-agnostic container interface (safely assumed to support singleton and bind).
   */
  abstract register(container: IContainer): void

  /**
   * Boots the service (optional).
   *
   * Called after the application has finished starting, used for initialization logic
   * (e.g., building database indexes, preheating cache, etc.).
   * Note: This may require framework-specific resources, which should be passed in by the framework adaptation layer.
   *
   * @param _context - Application context (framework-specific, Modules should not depend on it).
   */
  boot(_context: any): void {
    // Default empty implementation
  }
}
