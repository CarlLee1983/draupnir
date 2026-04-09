/**
 * AuthTokenRepository
 * Token 倉庫實現（ORM 無關）
 *
 * 設計：
 * - 依賴 IDatabaseAccess（由上層注入）
 * - 完全實現 IAuthTokenRepository
 * - 參考 AuthRepository 模式
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IAuthTokenRepository, TokenRecord } from '../../Domain/Repositories/IAuthTokenRepository'

export class AuthTokenRepository implements IAuthTokenRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(record: TokenRecord): Promise<void> {
    const existing = await this.db
      .table('auth_tokens')
      .where('token_hash', '=', record.tokenHash)
      .first()

    if (existing) {
      await this.db
        .table('auth_tokens')
        .where('token_hash', '=', record.tokenHash)
        .update({
          user_id: record.userId,
          token_hash: record.tokenHash,
          type: record.type,
          expires_at: record.expiresAt.toISOString(),
          revoked_at: record.revokedAt?.toISOString(),
          created_at: record.createdAt.toISOString(),
        })
    } else {
      await this.db.table('auth_tokens').insert({
        id: record.id,
        user_id: record.userId,
        token_hash: record.tokenHash,
        type: record.type,
        expires_at: record.expiresAt.toISOString(),
        revoked_at: record.revokedAt?.toISOString(),
        created_at: record.createdAt.toISOString(),
      })
    }
  }

  async findByHash(tokenHash: string): Promise<TokenRecord | null> {
    const row = await this.db
      .table('auth_tokens')
      .where('token_hash', '=', tokenHash)
      .first()

    return row ? this.mapToRecord(row) : null
  }

  async findByUserId(userId: string): Promise<TokenRecord[]> {
    const rows = await this.db
      .table('auth_tokens')
      .where('user_id', '=', userId)
      .where('revoked_at', '=', null)
      .where('expires_at', '>', new Date().toISOString())
      .select()

    return rows.map((row) => this.mapToRecord(row))
  }

  async findRevokedByUserId(userId: string): Promise<TokenRecord[]> {
    const rows = await this.db
      .table('auth_tokens')
      .where('user_id', '=', userId)
      .where('revoked_at', '!=', null)
      .select()

    return rows.map((row) => this.mapToRecord(row))
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.db
      .table('auth_tokens')
      .where('token_hash', '=', tokenHash)
      .update({
        revoked_at: new Date().toISOString(),
      })
  }

	async isRevoked(tokenHash: string): Promise<boolean> {
		const record = await this.findByHash(tokenHash)
		if (!record) {
			// 找不到記錄視為已撤銷（fail-closed）：缺少記錄不應授予存取權
			return true
		}
		return record.revokedAt !== undefined
	}

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.db
      .table('auth_tokens')
      .where('user_id', '=', userId)
      .where('revoked_at', '=', null)
      .update({
        revoked_at: new Date().toISOString(),
      })
  }

  async cleanupExpired(): Promise<void> {
    await this.db
      .table('auth_tokens')
      .where('expires_at', '<', new Date().toISOString())
      .delete()
  }

  async delete(id: string): Promise<void> {
    await this.db
      .table('auth_tokens')
      .where('id', '=', id)
      .delete()
  }

  /**
   * 將資料庫行對應到 TokenRecord
   */
  private mapToRecord(row: any): TokenRecord {
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      type: row.type,
      expiresAt: new Date(row.expires_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
      createdAt: new Date(row.created_at),
    }
  }
}
