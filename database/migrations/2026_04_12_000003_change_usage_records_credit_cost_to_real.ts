import { type Migration, DB } from '@gravito/atlas'

export default class ChangeUsageRecordsCreditCostToReal implements Migration {
  async up(): Promise<void> {
    // SQLite doesn't support ALTER COLUMN. We use the ADD-COPY-DROP-RENAME pattern.
    
    // 1. Add new REAL column
    await DB.raw('ALTER TABLE usage_records ADD COLUMN credit_cost_new REAL NOT NULL DEFAULT 0')
    
    // 2. Copy data with CAST
    await DB.raw('UPDATE usage_records SET credit_cost_new = CAST(credit_cost AS REAL)')
    
    // 3. Drop old column (Note: SQLite 3.35.0+ supports DROP COLUMN)
    await DB.raw('ALTER TABLE usage_records DROP COLUMN credit_cost')
    
    // 4. Rename new column to original name
    await DB.raw('ALTER TABLE usage_records RENAME COLUMN credit_cost_new TO credit_cost')
  }

  async down(): Promise<void> {
    // Reverse the process: REAL -> TEXT
    
    // 1. Add new TEXT column
    await DB.raw("ALTER TABLE usage_records ADD COLUMN credit_cost_old TEXT NOT NULL DEFAULT '0'")
    
    // 2. Copy data with CAST
    await DB.raw('UPDATE usage_records SET credit_cost_old = CAST(credit_cost AS TEXT)')
    
    // 3. Drop REAL column
    await DB.raw('ALTER TABLE usage_records DROP COLUMN credit_cost')
    
    // 4. Rename back
    await DB.raw('ALTER TABLE usage_records RENAME COLUMN credit_cost_old TO credit_cost')
  }
}
