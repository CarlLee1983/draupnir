/**
 * AuthToken value object.
 *
 * Responsibilities:
 * - Wrap raw JWT string with metadata.
 * - Track expiry and token kind (access vs refresh).
 *
 * Signing and verification are implemented by `JwtTokenService` (application layer).
 */

/**
 * Enumeration of authentication token types.
 */
export enum TokenType {
  /** Short-lived token used for accessing protected resources. */
  ACCESS = 'access',
  /** Long-lived token used to obtain new access tokens. */
  REFRESH = 'refresh',
}

/**
 * Structure of the decoded JWT payload.
 */
export interface TokenPayload {
  /** Unique identifier of the user. */
  userId: string
  /** User's email address. */
  email: string
  /** User's assigned role. */
  role: string
  /** List of permissions assigned to the user. */
  permissions: string[]
  /** JWT ID: unique identifier for this specific token. */
  jti: string
  /** Issued at: unix timestamp of when the token was created. */
  iat: number
  /** Expiration: unix timestamp of when the token expires. */
  exp: number
  /** The type of this token. */
  type: TokenType
}

/**
 * Value object representing an authentication token.
 */
export class AuthToken {
  /** The raw JWT string. */
  private readonly token: string
  /** Date and time when the token expires. */
  private readonly expiresAt: Date
  /** The type of the token (access or refresh). */
  private readonly type: TokenType
  /** Optional decoded payload data. */
  private readonly payload?: TokenPayload

  /**
   * Creates an instance of AuthToken.
   */
  constructor(
    token: string,
    expiresAt: Date,
    type: TokenType = TokenType.ACCESS,
    payload?: TokenPayload,
  ) {
    this.token = token
    this.expiresAt = expiresAt
    this.type = type
    this.payload = payload
  }

  /**
   * Gets the raw JWT string value.
   */
  getValue(): string {
    return this.token
  }

  /**
   * Gets the expiration instant of the token.
   */
  getExpiresAt(): Date {
    return this.expiresAt
  }

  /**
   * Gets the token type (access or refresh).
   */
  getType(): TokenType {
    return this.type
  }

  /**
   * Gets the decoded payload data, if available.
   */
  getPayload(): TokenPayload | undefined {
    return this.payload
  }

  /**
   * Checks if the token is currently expired.
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  /**
   * Checks if this is an access token.
   */
  isAccessToken(): boolean {
    return this.type === TokenType.ACCESS
  }

  /**
   * Checks if this is a refresh token.
   */
  isRefreshToken(): boolean {
    return this.type === TokenType.REFRESH
  }

  /**
   * Returns the string representation of the token (the raw JWT).
   */
  toString(): string {
    return this.token
  }

  /**
   * Checks structural equality based on the raw token string.
   */
  equals(other: unknown): boolean {
    return other instanceof AuthToken && other.token === this.token
  }
}
