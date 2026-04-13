/**
 * Database Connectivity Check Port (Port Pattern)
 *
 * @public - ORM-agnostic public interface.
 *
 * **Responsibilities**
 * - Responsible only for checking "if the database can be connected".
 * - Completely decoupled from specific ORMs/drivers.
 * - Used for health checks, diagnostics, etc.
 *
 * **Usage Locations**
 * - Application Layer: Health Check Service uses this interface to check status.
 * - Infrastructure Layer: ORM Adapters implement this interface (e.g., Atlas Adapter).
 *
 * **Port Pattern**
 * This follows the "Port" concept in Hexagonal Architecture:
 * - Defines the boundary contract between the application layer and external systems (database).
 * - The application layer is unaware of the underlying implementation.
 * - Faciltates easy mock testing.
 *
 * @design
 * - Simple: Only one method `ping()`.
 * - Non-intrusive: Does not change existing database connection logic.
 * - Testable: Easily mocked as a fake implementation.
 *
 * @example
 * ```typescript
 * // Application Layer: Health Check Service
 * export class HealthCheckService {
 *   constructor(private dbCheck: IDatabaseConnectivityCheck) {}
 *
 *   async checkDatabaseStatus(): Promise<boolean> {
 *     return this.dbCheck.ping()
 *   }
 * }
 *
 * // Infrastructure Layer: Atlas Adapter implementation
 * export class AtlasDatabaseConnectivityCheck implements IDatabaseConnectivityCheck {
 *   async ping(): Promise<boolean> {
 *     try {
 *       await DB.raw('SELECT 1')
 *       return true
 *     } catch {
 *       return false
 *     }
 *   }
 * }
 *
 * // Mock implementation in tests
 * class MockDatabaseConnectivityCheck implements IDatabaseConnectivityCheck {
 *   constructor(private isHealthy: boolean = true) {}
 *
 *   async ping(): Promise<boolean> {
 *     return this.isHealthy
 *   }
 * }
 * ```
 *
 * @see docs/ABSTRACTION_RULES.md - Abstraction rules for dependencies.
 */
export interface IDatabaseConnectivityCheck {
  /**
   * Executes a database connectivity check.
   *
   * The implementation should perform a simple database query (e.g., `SELECT 1`)
   * to verify the connection. It should not perform complex queries or modifications.
   *
   * @returns `true` if the database connection is normal, `false` otherwise.
   * @throws Should not throw exceptions; should return false directly.
   */
  ping(): Promise<boolean>
}
