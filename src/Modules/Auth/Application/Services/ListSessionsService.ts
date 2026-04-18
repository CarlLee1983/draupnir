import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'

/** One row for UI / API — no token hash exposed. */
export interface AuthSessionListItem {
  id: string
  type: 'access'
  createdAt: string
  expiresAt: string
  /** True when this row is the access token used for the current request. */
  isCurrent: boolean
}

export type ListSessionsResult =
  | { success: true; sessions: AuthSessionListItem[] }
  | { success: false; message: string; error: string }

/**
 * Lists active access-token sessions for a user (refresh rows omitted — paired with access at login).
 */
export class ListSessionsService {
  constructor(private readonly authTokenRepository: IAuthTokenRepository) {}

  async execute(userId: string, currentAccessTokenHash?: string | null): Promise<ListSessionsResult> {
    try {
      const rows = await this.authTokenRepository.findByUserId(userId)
      const accessOnly = rows.filter((r) => r.type === 'access')
      const sessions: AuthSessionListItem[] = accessOnly.map((r) => ({
        id: r.id,
        type: 'access',
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        isCurrent:
          currentAccessTokenHash != null &&
          currentAccessTokenHash !== '' &&
          r.tokenHash === currentAccessTokenHash,
      }))
      return { success: true, sessions }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to list sessions'
      return { success: false, message, error: 'LIST_SESSIONS_FAILED' }
    }
  }
}
