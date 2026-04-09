export interface ListUsersQuery {
  role?: string
  status?: string
  keyword?: string
  page?: number
  limit?: number
}

export interface UserListItemDTO {
  id: string
  email: string
  role: string
  status: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface ListUsersResponse {
  success: boolean
  message: string
  data?: {
    users: UserListItemDTO[]
    meta: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
  error?: string
}
