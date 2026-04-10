/**
 * Request payload for the login use case.
 */
export interface LoginRequest {
  /** The user's registered email address. */
  email: string
  /** The user's plain-text password. */
  password: string
}

/**
 * Response payload returned after a login attempt.
 */
export interface LoginResponse {
  /** Indicates if the login was successful. */
  success: boolean
  /** Descriptive message about the login result. */
  message: string
  /** Authentication data returned on success. */
  data?: {
    /** JWT access token for authenticating subsequent requests. */
    accessToken: string
    /** JWT refresh token for obtaining new access tokens. */
    refreshToken: string
    /** Basic user information. */
    user: {
      /** Unique identifier of the user. */
      id: string
      /** User's email address. */
      email: string
      /** User's assigned role. */
      role: string
    }
  }
  /** Error code or message if the login failed. */
  error?: string
}
