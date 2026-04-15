import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/IDatabaseConnectivityCheck'
import { AtlasQueryBuilder } from './AtlasQueryBuilder'

/** Converts camelCase / PascalCase table names to snake_case for PostgreSQL. */
const toSnakeCase = (name: string): string =>
  name.replace(/([A-Z])/g, (_, c: string) => `_${c.toLowerCase()}`)

/** ESM: `require('@gravito/atlas')` fails under Bun + `"type": "module"`; align with AtlasQueryBuilder. */
let atlasDbSingleton: any = null
async function getAtlasDB(): Promise<any> {
  if (!atlasDbSingleton) {
    atlasDbSingleton = (await import('@gravito/atlas')).DB
  }
  return atlasDbSingleton
}

/**
 * Atlas DatabaseAccess Implementation
 *
 * Implements the IDatabaseAccess interface, adapting the Gravito Atlas ORM to our
 * public interface. Hides all Atlas-specific API details and provides a unified
 * query interface.
 *
 * @internal This implementation is an infrastructure layer detail.
 */
class AtlasDatabaseAccess implements IDatabaseAccess {
  /**
   * Gets a query builder for a table.
   *
   * @param name - Table name.
   * @returns QueryBuilder instance for building queries.
   *
   * @example
   * const users = await db.table('users').select()
   * const user = await db.table('users').where('id', '=', userId).first()
   */
  table(name: string): IQueryBuilder {
    return new AtlasQueryBuilder(toSnakeCase(name))
  }

  async transaction<T>(fn: (tx: IDatabaseAccess) => Promise<T>): Promise<T> {
    const db = await getAtlasDB()
    return db.transaction(async (connection: any) => {
      const txAccess = new AtlasTransactionAccess(connection)
      return fn(txAccess)
    })
  }
}

/**
 * Transaction-scoped Atlas DatabaseAccess
 *
 * An IDatabaseAccess implementation for use within transactions; all queries
 * are executed via the same connection.
 *
 * @internal
 */
class AtlasTransactionAccess implements IDatabaseAccess {
  constructor(private readonly connection: any) {}

  table(name: string): IQueryBuilder {
    return new AtlasQueryBuilder(toSnakeCase(name), this.connection)
  }

  async transaction<T>(fn: (tx: IDatabaseAccess) => Promise<T>): Promise<T> {
    return fn(this)
  }
}

/**
 * Creates an Atlas DatabaseAccess instance.
 *
 * This factory function is the preferred way to create an Atlas adapter.
 * The application layer is injected with IDatabaseAccess through this function.
 *
 * @returns An instance implementing the IDatabaseAccess interface.
 *
 * @example
 * // Usage in the Wiring layer
 * const db = createAtlasDatabaseAccess()
 * registerUserRepositories(db)
 *
 * // Usage in a Repository
 * class UserRepository {
 *   constructor(private db: IDatabaseAccess) {}
 *   async findById(id: string) {
 *     return this.db.table('users').where('id', '=', id).first()
 *   }
 * }
 */
export function createAtlasDatabaseAccess(): IDatabaseAccess {
  return new AtlasDatabaseAccess()
}

/**
 * Adapter: Performs a database connectivity check (SELECT 1) using Atlas,
 * implementing IDatabaseConnectivityCheck.
 *
 * For use cases like health checks; the Application layer does not depend on @gravito/atlas.
 */
export function createGravitoDatabaseConnectivityCheck(): IDatabaseConnectivityCheck {
  return {
    async ping(): Promise<boolean> {
      try {
        const db = await getAtlasDB()
        await db.raw('SELECT 1')
        return true
      } catch {
        return false
      }
    },
  }
}
