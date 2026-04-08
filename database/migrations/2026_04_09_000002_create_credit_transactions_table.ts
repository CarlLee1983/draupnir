// database/migrations/2026_04_09_000002_create_credit_transactions_table.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class CreateCreditTransactionsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('credit_transactions', (table) => {
      table.string('id').primary()
      table.string('credit_account_id')
      table.string('type')
      table.string('amount')
      table.string('balance_after')
      table.string('reference_type').nullable()
      table.string('reference_id').nullable()
      table.text('description').nullable()
      table.timestamp('created_at')

      table.index(['credit_account_id'])
      table.foreign('credit_account_id').references('id').on('credit_accounts').onDelete('cascade')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('credit_transactions')
  }
}
