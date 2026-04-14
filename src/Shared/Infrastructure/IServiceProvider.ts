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
 * - `register()`: Sealed method — calls four protected hooks in fixed order.
 *   - `registerRepositories()`: Layer 1 — Repository implementations (infrastructure → domain port bindings).
 *   - `registerInfraServices()`: Layer 2 — Technical adapters (JWT / Email / OAuth / Queue / Dispatcher, etc.).
 *   - `registerApplicationServices()`: Layer 3 — Application Services (use-case services).
 *   - `registerControllers()`: Layer 4 — Controllers (registered for use by registerRoutes).
 * - `boot()`: Optional, executes initialization logic when the application starts.
 *
 * **Design Principles**
 * - Completely framework-agnostic: Only uses the IContainer interface.
 * - Sealed `register()`: Implemented as a readonly arrow property — subclasses declaring a same-name method
 *   will produce a TypeScript compile error, preventing accidental override.
 * - Four-hook architecture: Forces consistent DI registration order across all modules.
 *
 * @example
 * ```typescript
 * export class UserServiceProvider extends ModuleServiceProvider {
 *   protected override registerRepositories(container: IContainer): void {
 *     container.singleton('UserRepository', (c) => new UserRepository(c.make('db')))
 *   }
 *
 *   protected override registerApplicationServices(container: IContainer): void {
 *     container.singleton('UserService', (c) => new UserService(c.make('UserRepository')))
 *   }
 *
 *   protected override registerControllers(container: IContainer): void {
 *     container.bind('UserController', (c) => new UserController(c.make('UserService')))
 *   }
 * }
 * ```
 */
export abstract class ModuleServiceProvider {
  /**
   * Sealed：固定呼叫四個 hook，不可 override。
   * readonly arrow function property — 子類宣告同名 method 會產生 TypeScript 編譯錯誤。
   */
  readonly register: (container: IContainer) => void = (container) => {
    this.registerRepositories(container)
    this.registerInfraServices(container)
    this.registerApplicationServices(container)
    this.registerControllers(container)
  }

  /** Layer 1：Repository 實作（infrastructure → domain port 綁定） */
  protected registerRepositories(_container: IContainer): void {}

  /** Layer 2：技術 adapter（JWT / Email / OAuth / Queue / Dispatcher 等） */
  protected registerInfraServices(_container: IContainer): void {}

  /** Layer 3：Application Services（use-case services） */
  protected registerApplicationServices(_container: IContainer): void {}

  /** Layer 4：Controllers（登記至容器，供 registerRoutes 取用） */
  protected registerControllers(_container: IContainer): void {}

  /**
   * Boot hook：初始化用途（event 訂閱 / warmup / middleware 設定）。
   * 禁止在此做 DI 註冊（container.singleton / container.bind）。
   * 解包責任在 framework adapter，此處永遠收到 IContainer。
   */
  boot(_container: IContainer): void {}
}
