/**
 * Migration: 在 api_keys 表新增 quota_allocated 欄位（合約配額分配，以信用點數為單位）
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class AddQuotaAllocatedToApiKeys implements Migration {
  async up(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.integer('quota_allocated').default(0)
    })
  }

  async down(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.dropColumn('quota_allocated')
    })
  }
}
