/**
 * Migration: 建立 module_subscriptions（組織預設訂閱核心模組）
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateModuleSubscriptionsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('module_subscriptions', (table) => {
      table.string('id').primary()
      table.string('org_id')
      table.string('module_id')
      table.string('status').default('active')
      table.timestamp('subscribed_at')
      table.timestamp('updated_at')

      table.unique(['org_id', 'module_id'])
      table.foreign('org_id').references('id').on('organizations').onDelete('cascade')
      table.foreign('module_id').references('id').on('app_modules').onDelete('cascade')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('module_subscriptions')
  }
}
