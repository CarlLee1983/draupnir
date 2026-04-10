/**
 * Query parameters for filtering and paginating the user list.
 */
export interface ListUsersQuery {
  /** Filter users by their assigned role. */
  role?: string
  /** Filter users by their current account status. */
  status?: string
  /** Search keyword to match against email or display name. */
  keyword?: string
  /** Page number for pagination (starts from 1). */
  page?: number
  /** Number of items per page. */
  limit?: number
}

/**
 * Data transfer object representing a single user in a list view.
 */
export interface UserListItemDTO {
  /** Unique identifier of the user. */
  id: string
  /** User's email address. */
  email: string
  /** User's assigned role. */
  role: string
  /** User's current account status. */
  status: string
  /** User's display name, typically from their profile. */
  displayName: string
  /** URL to the user's avatar image, if available. */
  avatarUrl: string | null
  /** ISO timestamp of when the user account was created. */
  createdAt: string
  /** ISO timestamp of when the user account was last updated. */
  updatedAt: string
}

/**
 * Response payload containing a paginated list of users.
 */
export interface ListUsersResponse {
  /** Indicates if the query was successful. */
  success: boolean
  /** Descriptive message about the result. */
  message: string
  /** Result data if successful. */
  data?: {
    /** Array of user items matching the query. */
    users: UserListItemDTO[]
    /** Pagination metadata. */
    meta: {
      /** Total number of users matching the filter. */
      total: number
      /** Current page number. */
      page: number
      /** Number of items per page. */
      limit: number
      /** Total number of pages available. */
      totalPages: number
    }
  }
  /** Error code or message if the query failed. */
  error?: string
}
