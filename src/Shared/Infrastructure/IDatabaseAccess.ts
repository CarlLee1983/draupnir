/**
 * Database Access Abstraction (Port)
 *
 * Defines a query interface independent of specific ORMs (e.g., Atlas), allowing
 * the Infrastructure layer of each module to be replaced by mocks during testing.
 * This decouples Domain/Application logic from the actual DB implementation.
 *
 * @public - ORM-agnostic public API, usable by all layers.
 * @see docs/ABSTRACTION_RULES.md - Abstraction rules for dependencies.
 */

import type { AggregateSpec } from './Database/AggregateSpec'

/**
 * Query Builder Interface (Abstract Fluent API, supports test substitution)
 *
 * Provides a fluid query API, hiding specific ORM implementation details.
 * All layers can interact with the database through this interface without
 * knowing which ORM is actually being used.
 *
 * @public - ORM-agnostic public API.
 *
 * @example
 * ```typescript
 * const user = await db.table('users').where('id', '=', '123').first()
 * const users = await db.table('users').where('status', '=', 'active').select()
 * await db.table('users').insert({ email: 'test@example.com' })
 * ```
 */
export interface IQueryBuilder {
  /**
   * WHERE condition.
   * @param column - Column name.
   * @param operator - Comparison operator ('=', '!=', '>', '<', 'LIKE', etc.).
   * @param value - Comparison value.
   * @returns Returns self to support chaining.
   */
  where(column: string, operator: string, value: unknown): IQueryBuilder

  /**
   * Retrieves a single record.
   * @returns Returns the record if found, otherwise returns null.
   */
  first(): Promise<Record<string, unknown> | null>

  /**
   * Retrieves multiple records.
   * @returns Array of records.
   */
  select(): Promise<Record<string, unknown>[]>

  /**
   * Inserts a record.
   * @param data - The data to insert.
   */
  insert(data: Record<string, unknown>): Promise<void>

  /**
   * Inserts a record; silently ignores if a unique constraint on the specified target column(s) already exists.
   * Maps to SQLite `INSERT ... ON CONFLICT(target) DO NOTHING`.
   *
   * @param data - The data to insert.
   * @param options.conflictTarget - Column name (or list) that triggers the conflict-do-nothing.
   */
  insertOrIgnore(
    data: Record<string, unknown>,
    options: { readonly conflictTarget: string | readonly string[] },
  ): Promise<void>

  /**
   * Updates a record.
   * @param data - The data to update.
   */
  update(data: Record<string, unknown>): Promise<void>

  /**
   * Deletes a record.
   */
  delete(): Promise<void>

  /**
   * Limits the number of returned records.
   * @param n - Limit count.
   * @returns Returns self to support chaining.
   */
  limit(n: number): IQueryBuilder

  /**
   * Pagination offset.
   * @param n - Offset count.
   * @returns Returns self to support chaining.
   */
  offset(n: number): IQueryBuilder

  /**
   * Ordering.
   * @param column - Column to sort by.
   * @param direction - Sort direction ('ASC' or 'DESC').
   * @returns Returns self to support chaining.
   */
  orderBy(column: string, direction: 'ASC' | 'DESC'): IQueryBuilder

  /**
   * Range query.
   * @param column - Column name.
   * @param range - Range [start, end].
   * @returns Returns self to support chaining.
   */
  whereBetween(column: string, range: readonly [Date | string, Date | string]): IQueryBuilder

  /**
   * WHERE column IS NULL constraint.
   * @param column - Column name.
   * @returns Returns self to support chaining.
   */
  whereNull(column: string): IQueryBuilder

  /**
   * WHERE column IS NOT NULL constraint.
   * @param column - Column name.
   * @returns Returns self to support chaining.
   */
  whereNotNull(column: string): IQueryBuilder

  /**
   * Applies a row-level lock (SELECT ... FOR UPDATE) to the query.
   *
   * Must be invoked inside an open transaction (via {@link IDatabaseAccess.transaction}).
   * The lock is released when the transaction commits or rolls back.
   *
   * Memory adapter is single-threaded and treats this as a no-op.
   *
   * @returns Returns self to support chaining.
   */
  forUpdate(): IQueryBuilder

  /**
   * Counts records matching the criteria.
   * @returns Record count.
   */
  count(): Promise<number>

  /**
   * Declarative aggregation query.
   *
   * Runs GROUP BY / SUM / COUNT / AVG / MIN / MAX / dateTrunc / coalesce / add
   * against the current table and any previously-chained where/whereBetween
   * filters. Caller supplies the row DTO as `T`; adapter returns rows matching
   * the shape of `spec.select` keys.
   *
   * See AggregateSpec for the closed set of supported expressions.
   *
   * @typeParam T - Caller-supplied DTO shape, one field per spec.select alias.
   * @param spec - Declarative aggregate specification (select / groupBy / orderBy / limit).
   * @returns Array of T rows, one per group (or one row total if no groupBy).
   */
  aggregate<T>(spec: AggregateSpec): Promise<readonly T[]>
}

/**
 * Database Access Interface (for Dependency Injection)
 *
 * Hides specific ORM implementations and provides ORM-agnostic database access.
 * All layers should interact with the database through this interface.
 *
 * @public - ORM-agnostic public API, usable by all layers.
 *
 * @design
 * - Does not depend on specific ORM APIs.
 * - Supports common operations of major ORMs.
 * - When ORM-specific functionality is needed, extend this interface rather than bypassing it.
 *
 * @example
 * ```typescript
 * // Usage in a Repository
 * export class UserRepository implements IUserRepository {
 *   constructor(private db: IDatabaseAccess) {}
 *
 *   async findById(id: string): Promise<User | null> {
 *     const row = await this.db.table('users')
 *       .where('id', '=', id)
 *       .first()
 *     return row ? this.toDomain(row) : null
 *   }
 * }
 * ```
 */
export interface IDatabaseAccess {
  /**
   * Gets a query builder for a table.
   * @param name - Table name.
   * @returns IQueryBuilder instance supporting chaining.
   */
  table(name: string): IQueryBuilder

  /**
   * Executes a callback function within a database transaction.
   *
   * Automatically commits on success and rolls back on error.
   * The callback receives a transaction-scoped IDatabaseAccess instance,
   * ensuring all operations on this instance are performed within the same transaction.
   *
   * @template T - Callback return type.
   * @param fn - Transaction logic.
   * @returns The return value of the callback.
   */
  transaction<T>(fn: (tx: IDatabaseAccess) => Promise<T>): Promise<T>
}

/**
 * Backward compatibility: keep this alias when using existing naming.
 * @deprecated Use IDatabaseAccess instead.
 */
export type DatabaseAccess = IDatabaseAccess
