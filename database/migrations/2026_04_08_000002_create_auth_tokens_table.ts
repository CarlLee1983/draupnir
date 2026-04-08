/**
 * Migration: 建立 auth_tokens 表
 *
 * 儲存 JWT Token 記錄，用於 Token 撤銷追蹤與黑名單管理
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateAuthTokensTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('auth_tokens', (table) => {
      table.string('id').primary()
      table.string('user_id')
      table.string('token_hash').unique()
      table.string('type')          // 'access' | 'refresh'
      table.string('expires_at')
      table.string('revoked_at').nullable()
      table.string('created_at')

      table.index(['user_id'])
      table.foreign('user_id').references('id').on('users').onDelete('cascade')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('auth_tokens')
  }
}
