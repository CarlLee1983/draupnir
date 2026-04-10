/**
 * Database Access Port (Domain Layer)
 *
 * This re-exports IDatabaseAccess from the shared layer so that Domain
 * repository interfaces can reference it without importing from Infrastructure.
 *
 * @see src/Shared/Infrastructure/IDatabaseAccess.ts for the full definition.
 */
export type { IDatabaseAccess, IQueryBuilder } from '../Infrastructure/IDatabaseAccess'
