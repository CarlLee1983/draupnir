/**
 * Request payload for changing a user's account status.
 */
export interface ChangeUserStatusRequest {
  /**
   * The new status to apply to the user.
   * - 'active': User can log in and use the system.
   * - 'suspended': User is blocked from logging in.
   */
  status: 'active' | 'suspended'
}

/**
 * Response payload returned after attempting to change a user's status.
 */
export interface ChangeUserStatusResponse {
  /** Indicates if the operation was successful. */
  success: boolean
  /** Descriptive message about the result. */
  message: string
  /** Updated user data if successful. */
  data?: {
    /** Unique identifier of the user. */
    id: string
    /** User's email address. */
    email: string
    /** User's assigned role. */
    role: string
    /** The newly applied status. */
    status: string
    /** ISO timestamp of when the user was created. */
    createdAt: string
    /** ISO timestamp of when the user was last updated. */
    updatedAt: string
  }
  /** Error code or message if the operation failed. */
  error?: string
}
