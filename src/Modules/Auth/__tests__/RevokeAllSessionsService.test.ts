import { describe, expect, mock, test } from 'bun:test'
import { RevokeAllSessionsService } from '../Application/Services/RevokeAllSessionsService'
import type { IAuthTokenRepository } from '../Domain/Repositories/IAuthTokenRepository'

describe('RevokeAllSessionsService', () => {
  test('calls revokeAllByUserId', async () => {
    const revokeAllByUserId = mock(() => Promise.resolve())
    const repo: IAuthTokenRepository = {
      revokeAllByUserId,
    } as unknown as IAuthTokenRepository

    const svc = new RevokeAllSessionsService(repo)
    const result = await svc.execute('user-1')

    expect(result.success).toBe(true)
    expect(revokeAllByUserId).toHaveBeenCalledWith('user-1')
  })
})
