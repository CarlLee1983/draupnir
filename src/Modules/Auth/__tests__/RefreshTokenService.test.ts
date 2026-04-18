import { describe, expect, mock, test } from 'bun:test'
import { RefreshTokenService } from '../Application/Services/RefreshTokenService'
import { sha256 } from '../Application/Utils/sha256'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository, TokenRecord } from '../Domain/Repositories/IAuthTokenRepository'
import type { IJwtTokenService } from '../Application/Ports/IJwtTokenService'

function makeJwtService(overrides: Partial<IJwtTokenService> = {}): IJwtTokenService {
  return {
    verify: () => ({
      userId: 'u1',
      email: 'u@example.com',
      role: 'member',
      permissions: [],
      type: 'refresh',
    }),
    signAccessToken: () => ({
      getValue: () => 'new-access-token',
      getExpiresAt: () => new Date(Date.now() + 900_000),
    }),
    signRefreshToken: () => ({
      getValue: () => 'new-refresh-token',
      getExpiresAt: () => new Date(Date.now() + 86_400_000),
    }),
    ...overrides,
  } as unknown as IJwtTokenService
}

function makeAuthRepo(): IAuthRepository {
  return {
    findByEmail: async () => ({
      id: 'u1',
      emailValue: 'u@example.com',
      role: { getValue: () => 'member' },
    }),
  } as unknown as IAuthRepository
}

describe('RefreshTokenService', () => {
  test('re-checks revocation after save and compensates when a bulk revoke races in', async () => {
    const refreshToken = 'refresh-token-raw'
    const refreshHash = await sha256(refreshToken)
    const newAccessHash = await sha256('new-access-token')

    const saved: TokenRecord[] = []
    const revoked: string[] = []
    let revocationCheckCount = 0

    const repo: IAuthTokenRepository = {
      isRevoked: mock(async (hash: string) => {
        if (hash === refreshHash) {
          revocationCheckCount++
          // First check passes, second (post-save) fails → simulates a concurrent revokeAllByUserId
          return revocationCheckCount > 1
        }
        return false
      }),
      save: mock(async (record: TokenRecord) => {
        saved.push(record)
      }),
      revoke: mock(async (hash: string) => {
        revoked.push(hash)
      }),
    } as unknown as IAuthTokenRepository

    const svc = new RefreshTokenService(makeAuthRepo(), repo, makeJwtService())
    const result = await svc.execute({ refreshToken })

    expect(result.success).toBe(false)
    expect(result.error).toBe('TOKEN_REVOKED')
    // Access token was saved but then compensated by revoke(newAccessHash)
    expect(saved).toHaveLength(1)
    expect(revoked).toContain(newAccessHash)
  })

  test('happy path: issues a new access token when no race', async () => {
    const refreshToken = 'refresh-token-raw'

    const repo: IAuthTokenRepository = {
      isRevoked: mock(async () => false),
      save: mock(async () => {}),
      revoke: mock(async () => {}),
    } as unknown as IAuthTokenRepository

    const svc = new RefreshTokenService(makeAuthRepo(), repo, makeJwtService())
    const result = await svc.execute({ refreshToken })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data?.accessToken).toBe('new-access-token')
  })
})
