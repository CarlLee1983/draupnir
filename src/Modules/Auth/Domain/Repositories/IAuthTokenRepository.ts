/**
 * IAuthTokenRepository
 *
 * Token persistence port for issued tokens and revocation (logout / blacklist).
 *
 * Responsibilities:
 * - Persist issued token fingerprints
 * - Revoke tokens and query revocation state
 */

/**
 * Representation of a persisted authentication token record.
 */
export interface TokenRecord {
  /** Unique identifier for the token record. */
  id: string
  /** ID of the user the token belongs to. */
  userId: string
  /** SHA-256 hash of the raw token. */
  tokenHash: string
  /** Type of token (access vs refresh). */
  type: 'access' | 'refresh'
  /** Expiration timestamp of the token. */
  expiresAt: Date
  /** Timestamp of when the token was revoked, if applicable. */
  revokedAt?: Date
  /** Timestamp of when the token record was created. */
  createdAt: Date
}

/**
 * Port for managing persistence of authentication tokens.
 * Used for tracking revocation status and supporting features like "logout from all devices".
 */
export interface IAuthTokenRepository {
  /**
   * Persists a token record to the store.
   */
  save(record: TokenRecord): Promise<void>

  /**
   * Finds a token record by its SHA-256 hash.
   */
  findByHash(tokenHash: string): Promise<TokenRecord | null>

  /**
   * Retrieves all active (non-revoked and unexpired) tokens for a user.
   */
  findByUserId(userId: string): Promise<TokenRecord[]>

  /**
   * Retrieves all revoked token records associated with a user.
   */
  findRevokedByUserId(userId: string): Promise<TokenRecord[]>

  /**
   * Marks a token as revoked.
   */
  revoke(tokenHash: string): Promise<void>

  /**
   * Checks if a token hash is present in the blacklist or explicitly revoked.
   */
  isRevoked(tokenHash: string): Promise<boolean>

  /**
   * Revokes every active token for a given user.
   */
  revokeAllByUserId(userId: string): Promise<void>

  /**
   * Deletes token records that have naturally expired from the store.
   */
  cleanupExpired(): Promise<void>

  /**
   * Hard-deletes a specific token record from the store.
   */
  delete(id: string): Promise<void>
}
