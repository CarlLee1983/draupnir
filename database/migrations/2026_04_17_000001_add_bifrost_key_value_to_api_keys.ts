/**
 * Migration: api_keys 新增 bifrost_key_value 欄位
 *
 * 儲存 Bifrost 回傳的 virtual_key.value（sk-bf-... 格式）。
 * 建立時一次性回傳，後續 Bifrost 不再重新提供，因此需持久化。
 * bifrost_virtual_key_id 儲存 virtual_key.id（UUID，管理 API 使用）。
 * bifrost_key_value 儲存 virtual_key.value（用戶用的 API key 字串）。
 * 舊有記錄為 NULL（未能於建立時記錄），可於必要時手動回填。
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class AddBifrostKeyValueToApiKeys implements Migration {
  async up(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.string('bifrost_key_value').nullable()
    })
  }

  async down(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.dropColumn('bifrost_key_value')
    })
  }
}
