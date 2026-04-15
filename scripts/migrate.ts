#!/usr/bin/env bun

import { DB, Migrator, SeederRunner } from '@gravito/atlas'
import databaseConfig from '../config/database'
import { joinPath } from '../src/Website/Http/Routing/routePath'

const MIGRATIONS_PATH = joinPath(process.cwd(), 'database/migrations')
const SEEDERS_PATH = joinPath(process.cwd(), 'database/seeders')

async function main(): Promise<void> {
  DB.configure(databaseConfig)
  const connection = DB.getDefaultConnection()

  const command = process.argv[2] ?? 'run'

  if (command === 'run') {
    const migrator = new Migrator({ path: MIGRATIONS_PATH, connection })
    const result = await migrator.run()
    if (result.migrations.length > 0) {
      console.log(`✅ Applied ${result.migrations.length} migrations`)
    } else {
      console.log('✅ No pending migrations')
    }
    return
  }

  if (command === 'fresh') {
    const migrator = new Migrator({ path: MIGRATIONS_PATH, connection })
    const result = await migrator.fresh()
    console.log(`✅ Refreshed database (${result.migrations.length} migrations run)`)
    return
  }

  if (command === 'seed') {
    const seeder = new SeederRunner({ path: SEEDERS_PATH, connection })
    await seeder.run()
    console.log('✅ Seeders completed')
    return
  }

  console.error(`❌ Unknown command: ${command}`)
  console.error('Usage: bun scripts/migrate.ts [run|fresh|seed]')
  process.exit(1)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Migration failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
