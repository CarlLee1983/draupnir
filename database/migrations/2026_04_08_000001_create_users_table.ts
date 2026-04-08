/**
 * Migration: 建立 users 表
 *
 * 儲存系統中的所有使用者，包含認證資訊與角色狀態
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateUsersTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('users', (table) => {
      table.string('id').primary()
      table.string('email').unique()
      table.string('password')
      table.string('role').default('user')
      table.string('status').default('active')
      table.timestamps()
    })

    // email 查詢索引（unique 已自帶）
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('users')
  }
}
