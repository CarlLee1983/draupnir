import { DB, Migrator } from '@gravito/atlas'
import { joinPath } from '@/Website/Http/Routing/routePath'

const MIGRATIONS_PATH = joinPath(process.cwd(), 'database/migrations')

/**
 * Configure Atlas DB and run all pending migrations against the given sqlite file.
 */
export async function runAcceptanceMigrations(dbPath: string): Promise<void> {
  DB.configure({
    default: 'sqlite',
    connections: {
      sqlite: {
        driver: 'sqlite',
        database: dbPath,
      },
    },
  })

  const connection = DB.getDefaultConnection()
  const migrator = new Migrator({ path: MIGRATIONS_PATH, connection })
  await migrator.run()
}
