import { DB, type Migration } from '@gravito/atlas'

export default class AddUniqueUsageDeductionIndexToCreditTransactions implements Migration {
  async up(): Promise<void> {
    await DB.raw(
      `CREATE UNIQUE INDEX IF NOT EXISTS uniq_credit_usage_deduction ON credit_transactions (credit_account_id, reference_id) WHERE type = 'deduction' AND reference_type = 'usage_record' AND reference_id IS NOT NULL`,
    )
  }

  async down(): Promise<void> {
    await DB.raw(`DROP INDEX IF EXISTS uniq_credit_usage_deduction`)
  }
}
