#!/usr/bin/env bun

import { DB, Migrator } from '@gravito/atlas'
import databaseConfig from '../config/database'
import { joinPath } from '../src/Pages/routing/pathUtils'

async function main(): Promise<void> {
  DB.configure(databaseConfig)

  const migrator = new Migrator({
    path: joinPath(process.cwd(), 'database/migrations'),
    connection: DB.getDefaultConnection(),
  })

  const result = await migrator.run()
  if (result.migrations.length > 0) {
    console.log(`✅ Applied ${result.migrations.length} migrations`)
    return
  }

  console.log('✅ No pending migrations')
}

main().catch((error) => {
  console.error('❌ Migration run failed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
