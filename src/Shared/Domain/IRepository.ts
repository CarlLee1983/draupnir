/**
 * Base Repository Interface - Defines the common contract for all repositories.
 *
 * @public - Public interface defined in the Domain layer. All repository
 * implementations must follow this contract.
 *
 * **Layered Design**
 * - Definition Location: Domain Layer (`src/Shared/Domain/IRepository.ts`)
 * - Implementation Location: Infrastructure Layer (`src/Modules/{Module}/Infrastructure/Repositories/`)
 * - Consumers: Application Layer Services, Controllers
 *
 * **Dependency Inversion**
 * High-level (Application) depends on this abstraction, not concrete implementations.
 * Concrete implementation (Infrastructure Repository) depends on this abstraction.
 *
 * ```
 * Application Service
 *     ↓ (Depends)
 * IRepository<T> (Public Interface)
 *     ↑ (Implementation)
 * InfrastructureRepository (Concrete Implementation)
 * ```
 *
 * @design
 * - ORM Agnostic: Repository implementation hides ORM details from the outside world.
 * - Generic: Supports any Entity type that implements BaseEntity.
 * - Asynchronous Operations: All methods are asynchronous, supporting various ORMs and storage layers.
 *
 * @example
 * ```typescript
 * // Domain Layer: Define Interface
 * export interface IUserRepository extends IRepository<User> {
 *   findByEmail(email: string): Promise<User | null>
 * }
 *
 * // Infrastructure Layer: Implement Interface (using any ORM)
 * export class UserRepository implements IUserRepository {
 *   constructor(private db: IDatabaseAccess) {}
 *
 *   async save(user: User): Promise<void> {
 *     await this.db.table('users').insert(this.toRow(user))
 *   }
 *
 *   async findById(id: string): Promise<User | null> {
 *     const row = await this.db.table('users')
 *       .where('id', '=', id)
 *       .first()
 *     return row ? this.toDomain(row) : null
 *   }
 * }
 *
 * // Application Layer: Use Repository (unaware of implementation details)
 * export class UserService {
 *   constructor(private repo: IUserRepository) {}
 *
 *   async getUser(id: string): Promise<User | null> {
 *     return this.repo.findById(id)
 *   }
 * }
 * ```
 *
 * @see docs/ABSTRACTION_RULES.md - Rules for dependency abstraction
 */

import type { BaseEntity } from './BaseEntity'

export interface IRepository<T extends BaseEntity> {
  /**
   * Saves an entity (Create or Update).
   *
   * Implementation details are decided by the concrete Repository. Based on the
   * Entity's state, it decides whether to execute an INSERT or UPDATE operation.
   *
   * @param entity - The entity to save.
   * @throws Should throw appropriate errors if saving fails.
   */
  save(entity: T): Promise<void>

  /**
   * Query a single entity by ID.
   *
   * @param id - Entity ID.
   * @returns Returns the entity if it exists, otherwise null.
   */
  findById(id: string): Promise<T | null>

  /**
   * Deletes an entity.
   *
   * @param id - The ID of the entity to delete.
   * @throws Behavior on deletion failure or non-existent entity is implementation-defined.
   */
  delete(id: string): Promise<void>

  /**
   * Queries all entities (Supports pagination and filtering).
   *
   * @param params - Query parameters.
   * @param params.limit - Maximum number of records to return.
   * @param params.offset - Pagination offset.
   * @param params[key] - Other filter conditions (defined by concrete implementation).
   * @returns An array of matching entities.
   */
  
// biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
findAll(params?: { limit?: number; offset?: number; [key: string]: any }): Promise<T[]>

  /**
   * Counts the total number of entities matching conditions.
   *
   * Commonly used for pagination to calculate total pages.
   *
   * @param params - Filter conditions (must match findAll).
   * @returns Total number of matching entities.
   */
  
// biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
count(params?: { [key: string]: any }): Promise<number>
}
