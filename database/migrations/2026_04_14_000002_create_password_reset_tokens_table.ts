/**
 * Migration: 建立 password_reset_tokens 表
 *
 * 儲存密碼重設一次性 token（與 Domain 的 PasswordResetToken 對應）
 * 主鍵 id 即 token 字串，便於 MemoryDatabaseAccess 的 where/update 行為一致。
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreatePasswordResetTokensTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('password_reset_tokens', (table) => {
      table.string('id').primary()
      table.string('email')
      table.string('expires_at')
      table.boolean('used').default(false)

      table.index(['email'])
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('password_reset_tokens')
  }
}
