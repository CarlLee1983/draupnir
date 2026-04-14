/**
 * Migration: 建立 email_verification_tokens 表
 *
 * 儲存信箱驗證一次性 token（與 Domain 的 EmailVerificationToken 對應）
 * 主鍵 id 即 token 字串，便於 MemoryDatabaseAccess 的 where/update 行為一致。
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateEmailVerificationTokensTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('email_verification_tokens', (table) => {
      table.string('id').primary()
      table.string('email')
      table.string('expires_at')
      table.boolean('used').default(false)

      table.index(['email'])
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('email_verification_tokens')
  }
}
