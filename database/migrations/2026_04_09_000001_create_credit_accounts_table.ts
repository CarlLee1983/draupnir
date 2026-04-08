// database/migrations/2026_04_09_000001_create_credit_accounts_table.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class CreateCreditAccountsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('credit_accounts', (table) => {
      table.string('id').primary()
      table.string('org_id').unique()
      table.string('balance').default('0')
      table.string('low_balance_threshold').default('100')
      table.string('status').default('active')
      table.timestamps()

      table.foreign('org_id').references('id').on('organizations').onDelete('cascade')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('credit_accounts')
  }
}
