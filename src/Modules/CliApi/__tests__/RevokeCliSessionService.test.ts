// src/Modules/CliApi/__tests__/RevokeCliSessionService.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import { RevokeCliSessionService } from '../Application/Services/RevokeCliSessionService'

function createMockAuthTokenRepo(): IAuthTokenRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findByUserId: vi.fn().mockResolvedValue([]),
    isRevoked: vi.fn().mockResolvedValue(false),
    revokeAllByUserId: vi.fn().mockResolvedValue(undefined),
    revoke: vi.fn().mockResolvedValue(undefined),
    deleteExpired: vi.fn().mockResolvedValue(0),
  } as unknown as IAuthTokenRepository
}

describe('RevokeCliSessionService', () => {
  let service: RevokeCliSessionService
  let mockRepo: IAuthTokenRepository

  beforeEach(() => {
    mockRepo = createMockAuthTokenRepo()
    service = new RevokeCliSessionService(mockRepo)
  })

  it('should revoke a specific token by hash', async () => {
    const result = await service.execute({
      userId: 'user-1',
      tokenHash: 'abc123hash',
    })
    expect(result.success).toBe(true)
    expect(mockRepo.revoke).toHaveBeenCalledWith('abc123hash')
  })

  it('should revoke all tokens for a user', async () => {
    const result = await service.executeRevokeAll({
      userId: 'user-1',
    })
    expect(result.success).toBe(true)
    expect(mockRepo.revokeAllByUserId).toHaveBeenCalledWith('user-1')
  })

  it('should handle revocation errors gracefully', async () => {
    const failRepo = {
      ...createMockAuthTokenRepo(),
      revoke: vi.fn().mockRejectedValue(new Error('DB error')),
    } as unknown as IAuthTokenRepository
    const failService = new RevokeCliSessionService(failRepo)

    const result = await failService.execute({
      userId: 'user-1',
      tokenHash: 'abc123hash',
    })
    expect(result.success).toBe(false)
    expect(result.message).toContain('DB error')
  })
})
