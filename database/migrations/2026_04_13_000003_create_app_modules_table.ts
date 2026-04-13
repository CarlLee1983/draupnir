/**
 * Migration: 建立 app_modules
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateAppModulesTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('app_modules', (table) => {
      table.string('id').primary()
      table.string('name').unique()
      table.text('description').nullable()
      table.string('type').default('free')
      table.string('status').default('active')
      table.timestamps()
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('app_modules')
  }
}
