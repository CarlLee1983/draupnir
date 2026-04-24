import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { ACCEPTANCE_TABLES } from './tables'

/**
 * Empty every known acceptance-layer table.
 */
export async function truncateAcceptanceTables(db: IDatabaseAccess): Promise<void> {
  for (const table of ACCEPTANCE_TABLES) {
    await db.table(table).delete()
  }
}
