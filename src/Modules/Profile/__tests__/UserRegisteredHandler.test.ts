/**
 * UserRegisteredHandler 單元測試
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRegisteredHandler } from '../Application/EventHandlers/UserRegisteredHandler'
import type { IUserProfileRepository } from '../Domain/Repositories/IUserProfileRepository'

describe('UserRegisteredHandler', () => {
  let handler: UserRegisteredHandler
  let mockRepository: IUserProfileRepository

  beforeEach(() => {
    mockRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findByUserId: vi.fn(),
      update: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
    }
    handler = new UserRegisteredHandler(mockRepository)
  })

  it('應該以 userId 和 email 建立預設 UserProfile 並呼叫 save()', async () => {
    const userId = 'user-uuid-123'
    const email = 'test@example.com'

    await handler.execute(userId, email)

    expect(mockRepository.save).toHaveBeenCalledTimes(1)
    const savedProfile = (mockRepository.save as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(savedProfile).toBeDefined()
    expect(savedProfile.userId).toBe(userId)
  })

  it('userId 為空字串時應拋出錯誤', async () => {
    await expect(handler.execute('', 'test@example.com')).rejects.toThrow(
      'UserRegisteredHandler: userId and email are required',
    )
    expect(mockRepository.save).not.toHaveBeenCalled()
  })

  it('email 為空字串時應拋出錯誤', async () => {
    await expect(handler.execute('user-uuid-123', '')).rejects.toThrow(
      'UserRegisteredHandler: userId and email are required',
    )
    expect(mockRepository.save).not.toHaveBeenCalled()
  })
})
