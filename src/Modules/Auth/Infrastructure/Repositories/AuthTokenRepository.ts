/**
 * AuthTokenRepository
 * ORM-agnostic implementation of `IAuthTokenRepository`.
 *
 * Design:
 * - Depends on `IDatabaseAccess` from wiring
 * - Mirrors the `AuthRepository` port/adapter style
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type {
  IAuthTokenRepository,
  TokenRecord,
} from '../../Domain/Repositories/IAuthTokenRepository'

/**
 * Concrete implementation of IAuthTokenRepository using an ORM-agnostic database access layer.
 * Manages persistence of JWT tokens for revocation and rotation purposes.
 */
export class AuthTokenRepository implements IAuthTokenRepository {
  /**
   * Creates an instance of AuthTokenRepository.
   */
  constructor(private readonly db: IDatabaseAccess) {}

  /**
   * Persists a token record (upsert).
   */
  async save(record: TokenRecord): Promise<void> {
    const existing = await this.db
      .table('auth_tokens')
      .where('token_hash', '=', record.tokenHash)
      .first()

    if (existing) {
      await this.db.table('auth_tokens').where('token_hash', '=', record.tokenHash).update({
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

  /**
   * Finds a token record by its SHA-256 hash.
   */
  async findByHash(tokenHash: string): Promise<TokenRecord | null> {
    const row = await this.db.table('auth_tokens').where('token_hash', '=', tokenHash).first()

    return row ? this.mapToRecord(row) : null
  }

  /**
   * Retrieves all active (non-revoked and unexpired) tokens for a user.
   */
  async findByUserId(userId: string): Promise<TokenRecord[]> {
    const rows = await this.db
      .table('auth_tokens')
      .where('user_id', '=', userId)
      .where('revoked_at', '=', null)
      .where('expires_at', '>', new Date().toISOString())
      .select()

    return rows.map((row) => this.mapToRecord(row))
  }

  /**
   * Retrieves all revoked token records for a specific user.
   */
  async findRevokedByUserId(userId: string): Promise<TokenRecord[]> {
    const rows = await this.db
      .table('auth_tokens')
      .where('user_id', '=', userId)
      .where('revoked_at', '!=', null)
      .select()

    return rows.map((row) => this.mapToRecord(row))
  }

  /**
   * Marks a specific token as revoked.
   */
  async revoke(tokenHash: string): Promise<void> {
    await this.db.table('auth_tokens').where('token_hash', '=', tokenHash).update({
      revoked_at: new Date().toISOString(),
    })
  }

  /**
   * Checks if a token hash is currently revoked.
   * Fails closed: if no record is found, it is treated as revoked/untrusted.
   */
  async isRevoked(tokenHash: string): Promise<boolean> {
    const record = await this.findByHash(tokenHash)
    if (!record) {
      return true
    }
    return record.revokedAt !== undefined
  }

  /**
   * Revokes all active tokens for a user, effectively signing them out of all devices.
   */
  async revokeAllByUserId(userId: string): Promise<void> {
    await this.db
      .table('auth_tokens')
      .where('user_id', '=', userId)
      .where('revoked_at', '=', null)
      .update({
        revoked_at: new Date().toISOString(),
      })
  }

  /**
   * Physically removes expired tokens from the database to save space.
   */
  async cleanupExpired(): Promise<void> {
    await this.db.table('auth_tokens').where('expires_at', '<', new Date().toISOString()).delete()
  }

  /**
   * Hard-deletes a single token record by its primary key.
   */
  async delete(id: string): Promise<void> {
    await this.db.table('auth_tokens').where('id', '=', id).delete()
  }

  /**
   * Maps a raw database row to a TokenRecord structure.
   */
  
// biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
private  mapToRecord(row: any): TokenRecord {
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
