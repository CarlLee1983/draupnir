/**
 * Request payload for registering a new user.
 */
export interface RegisterUserRequest {
  /** The email address to register. */
  email: string
  /** The chosen password for the new account. */
  password: string
  /** Optional password confirmation for validation. */
  confirmPassword?: string
}

/**
 * Response payload returned after a registration attempt.
 */
export interface RegisterUserResponse {
  /** Indicates if the registration was successful. */
  success: boolean
  /** Descriptive message about the result. */
  message: string
  /** Data of the newly created user if successful. */
  data?: {
    /** Unique identifier assigned to the new user. */
    id: string
    /** The registered email address. */
    email: string
    /** The default role assigned to the new user. */
    role: string
  }
  /** Error code or message if registration failed. */
  error?: string
}
