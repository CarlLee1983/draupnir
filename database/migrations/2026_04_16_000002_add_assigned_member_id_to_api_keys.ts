/**
 * Migration: api_keys 新增 assigned_member_id 欄位（可視度指派 → user_id）
 *
 * 值為 NULL 代表未指派。指派 FK 僅到 users(id)；跨組織一致性由應用層驗證（IApiKeyRepository 與 AssignApiKeyService）。
 * user 被實體刪除時應 set NULL，避免殘留指向已刪除 user。
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class AddAssignedMemberIdToApiKeys implements Migration {
  async up(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.string('assigned_member_id').nullable()
      table.index('assigned_member_id')
    })
  }

  async down(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.dropIndex('assigned_member_id')
      table.dropColumn('assigned_member_id')
    })
  }
}
