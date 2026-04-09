// database/migrations/2026_04_09_000005_create_pricing_rules_table.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class CreatePricingRulesTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('pricing_rules', (table) => {
      table.string('id').primary()
      table.string('model_pattern')
      table.string('input_token_price')
      table.string('output_token_price')
      table.string('image_price').nullable()
      table.string('audio_price').nullable()
      table.integer('priority').default(0)
      table.boolean('is_active').default(true)
      table.timestamps()
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('pricing_rules')
  }
}
