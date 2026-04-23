#!/usr/bin/env bun

import { DB, Migrator } from '@gravito/atlas'
import { joinPath } from '../src/Pages/routing/pathUtils'

interface SchemaColumn {
  name: string
  type: string
  nullable: boolean
}

interface SchemaTable {
  name: string
  columns: SchemaColumn[]
}

interface ColumnDiff {
  table: string
  column: string
  expected?: SchemaColumn
  actual?: SchemaColumn
  issue: 'missing-table' | 'extra-table' | 'missing-column' | 'extra-column' | 'type-mismatch'
}

const MIGRATION_TABLE_NAMES = new Set(['migrations'])

function normalizeType(type: string): string {
  const value = type.trim().toLowerCase()
  if (
    value.includes('char') ||
    value.includes('text') ||
    value.includes('uuid') ||
    value.includes('date') ||
    value.includes('time') ||
    value.includes('json') ||
    value.includes('xml') ||
    value.includes('enum')
  ) {
    return 'string'
  }
  if (
    value.includes('int') ||
    value.includes('numeric') ||
    value.includes('decimal') ||
    value.includes('real') ||
    value.includes('double') ||
    value.includes('float') ||
    value.includes('serial')
  ) {
    return 'number'
  }
  if (value.includes('bool')) {
    return 'boolean'
  }
  return value
}

function typesMatch(expected: string, actual: string): boolean {
  if (expected === actual) return true
  if (expected === 'boolean' && (actual === 'number' || actual === 'integer')) {
    return true
  }
  return false
}

function escapeSqlString(value: string): string {
  return value.replaceAll("'", "''")
}

function getTableNameFromSchema(table: unknown): string | null {
  if (!table || typeof table !== 'object') return null
  for (const symbol of Object.getOwnPropertySymbols(table)) {
    if (symbol.toString() === 'Symbol(drizzle:Name)') {
      return String((table as Record<symbol, unknown>)[symbol])
    }
  }
  return null
}

function getColumnsFromSchema(table: unknown): SchemaColumn[] {
  if (!table || typeof table !== 'object') return []
  const columnsSymbol = Object.getOwnPropertySymbols(table).find(
    (symbol) => symbol.toString() === 'Symbol(drizzle:Columns)',
  )
  if (!columnsSymbol) return []

  const columns = (table as Record<symbol, unknown>)[columnsSymbol]
  if (!columns || typeof columns !== 'object') return []

  return Object.values(columns as Record<string, unknown>).map((column) => {
    const config = (column as { config?: Record<string, unknown> }).config ?? {}
    return {
      name: String((column as { name?: unknown }).name ?? config.name ?? ''),
      type: normalizeType(String(config.dataType ?? (column as { dataType?: unknown }).dataType ?? 'string')),
      nullable: !(Boolean(config.notNull ?? (column as { notNull?: unknown }).notNull)),
    }
  })
}

async function loadExpectedSchema(): Promise<SchemaTable[]> {
  const schemaModule = await import('../src/Shared/Infrastructure/Database/schema.ts')
  return Object.entries(schemaModule)
    .map(([name, table]) => {
      const tableName = getTableNameFromSchema(table)
      if (!tableName || MIGRATION_TABLE_NAMES.has(tableName)) {
        return null
      }
      return {
        name: tableName,
        columns: getColumnsFromSchema(table),
      }
    })
    .filter((table): table is SchemaTable => Boolean(table))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function applyMigrations(connectionName: string): Promise<void> {
  const migrator = new Migrator({
    path: joinPath(process.cwd(), 'database/migrations'),
    connection: connectionName,
  })
  const result = await migrator.run()
  if (result.migrations.length > 0) {
    console.log(`✅ Applied ${result.migrations.length} migrations`)
  } else {
    console.log('✅ No pending migrations')
  }
}

async function loadActualSchema(connectionName: string): Promise<SchemaTable[]> {
  const connection = DB.connection(connectionName)
  const driverName = connection.getDriver().getDriverName()

  if (driverName === 'postgres') {
    const tablesResult = await connection.raw<{ table_name: string }>(`
      select table_name
      from information_schema.tables
      where table_schema = current_schema()
        and table_type = 'BASE TABLE'
        and table_name <> 'migrations'
      order by table_name
    `)
    const columnsResult = await connection.raw<{
      table_name: string
      column_name: string
      is_nullable: string
      data_type: string
      udt_name: string
    }>(`
      select table_name, column_name, is_nullable, data_type, udt_name
      from information_schema.columns
      where table_schema = current_schema()
        and table_name <> 'migrations'
      order by table_name, ordinal_position
    `)

    const columnsByTable = new Map<string, SchemaColumn[]>()
    for (const row of columnsResult.rows) {
      const bucket = columnsByTable.get(row.table_name) ?? []
      bucket.push({
        name: row.column_name,
        type: normalizeType(row.data_type || row.udt_name),
        nullable: row.is_nullable === 'YES',
      })
      columnsByTable.set(row.table_name, bucket)
    }

    return tablesResult.rows
      .filter((row) => !MIGRATION_TABLE_NAMES.has(row.table_name))
      .map((row) => ({
        name: row.table_name,
        columns: columnsByTable.get(row.table_name) ?? [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  if (driverName === 'sqlite') {
    const tablesResult = await connection.raw<{ name: string }>(`
      select name
      from sqlite_master
      where type = 'table'
        and name not like 'sqlite_%'
        and name <> 'migrations'
      order by name
    `)

    const tables: SchemaTable[] = []
    for (const row of tablesResult.rows) {
      const columnsResult = await connection.raw<{
        name: string
        type: string
        notnull: number
      }>(`pragma table_info('${escapeSqlString(row.name)}')`)

      tables.push({
        name: row.name,
        columns: columnsResult.rows.map((column) => ({
          name: column.name,
          type: normalizeType(column.type || 'string'),
          nullable: column.notnull === 0,
        })),
      })
    }

    return tables.sort((a, b) => a.name.localeCompare(b.name))
  }

  throw new Error(`Unsupported database driver for drift check: ${driverName}`)
}

function diffSchemas(expected: SchemaTable[], actual: SchemaTable[]): ColumnDiff[] {
  const diffs: ColumnDiff[] = []
  const actualByTable = new Map(actual.map((table) => [table.name, table]))

  for (const expectedTable of expected) {
    const actualTable = actualByTable.get(expectedTable.name)
    if (!actualTable) {
      diffs.push({
        table: expectedTable.name,
        column: '',
        expected: undefined,
        actual: undefined,
        issue: 'missing-table',
      })
      continue
    }

    const actualColumns = new Map(actualTable.columns.map((column) => [column.name, column]))
    for (const expectedColumn of expectedTable.columns) {
      const actualColumn = actualColumns.get(expectedColumn.name)
      if (!actualColumn) {
        diffs.push({
          table: expectedTable.name,
          column: expectedColumn.name,
          expected: expectedColumn,
          actual: undefined,
          issue: 'missing-column',
        })
        continue
      }

      if (!typesMatch(expectedColumn.type, actualColumn.type)) {
        diffs.push({
          table: expectedTable.name,
          column: expectedColumn.name,
          expected: expectedColumn,
          actual: actualColumn,
          issue: 'type-mismatch',
        })
      }

    }

    for (const actualColumn of actualTable.columns) {
      if (!expectedTable.columns.some((column) => column.name === actualColumn.name)) {
        diffs.push({
          table: expectedTable.name,
          column: actualColumn.name,
          expected: undefined,
          actual: actualColumn,
          issue: 'extra-column',
        })
      }
    }
  }

  for (const actualTable of actual) {
    if (!expected.some((table) => table.name === actualTable.name)) {
      diffs.push({
        table: actualTable.name,
        column: '',
        expected: undefined,
        actual: undefined,
        issue: 'extra-table',
      })
    }
  }

  return diffs
}

function printDiffs(diffs: ColumnDiff[]): void {
  console.error('\n❌ Schema drift detected')
  for (const diff of diffs) {
    switch (diff.issue) {
      case 'missing-table':
        console.error(`- missing table: ${diff.table}`)
        break
      case 'extra-table':
        console.error(`- extra table: ${diff.table}`)
        break
      case 'missing-column':
        console.error(
          `- missing column: ${diff.table}.${diff.column} expected ${diff.expected?.type ?? 'unknown'}${diff.expected?.nullable ? ' nullable' : ' required'}`,
        )
        break
      case 'extra-column':
        console.error(
          `- extra column: ${diff.table}.${diff.column} actual ${diff.actual?.type ?? 'unknown'}${diff.actual?.nullable ? ' nullable' : ' required'}`,
        )
        break
      case 'type-mismatch':
        console.error(
          `- type mismatch: ${diff.table}.${diff.column} expected ${diff.expected?.type} actual ${diff.actual?.type}`,
        )
        break
    }
  }
}

async function main(): Promise<void> {
  console.log('🔧 Running migrations before schema comparison...')
  const databaseConfig = (await import('../config/database.ts')).default
  DB.configure(databaseConfig)
  const connectionName = DB.getDefaultConnection()
  await applyMigrations(connectionName)

  const expected = await loadExpectedSchema()
  const actual = await loadActualSchema(connectionName)
  const diffs = diffSchemas(expected, actual)

  console.log(`📦 Expected tables: ${expected.length}`)
  console.log(`📦 Actual tables: ${actual.length}`)

  if (diffs.length > 0) {
    printDiffs(diffs)
    process.exitCode = 1
    return
  }

  console.log('✅ Schema drift check passed — Schema matches the live database')
}

main().catch((error) => {
  console.error('❌ Schema drift check crashed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
