import { describe, expect, mock, test } from 'bun:test'
import type { IPasswordHasher } from '../Application/Ports/IPasswordHasher'
import { ChangePasswordService } from '../Application/Services/ChangePasswordService'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../Domain/Repositories/IAuthTokenRepository'
import { Password } from '../Domain/ValueObjects/Password'

describe('ChangePasswordService', () => {
  const hashedOld = 'scrypt:old-hash'
  const mockUser = {
    id: 'u1',
    password: Password.fromHashed(hashedOld),
    withPassword: mock((h: string) => ({ id: 'u1', savedHash: h })),
  } as any

  test('rejects wrong current password', async () => {
    const save = mock(async () => {})
    const authRepo: IAuthRepository = {
      findById: mock(async () => mockUser),
      save,
    } as any
    const hasher: IPasswordHasher = {
      hash: mock(async () => 'new-hash'),
      verify: mock(async () => false),
    }
    const tokenRepo: IAuthTokenRepository = {
      revokeAllByUserId: mock(async () => {}),
    } as any

    const svc = new ChangePasswordService(authRepo, hasher, tokenRepo)
    const r = await svc.execute('u1', 'wrong', 'NewPassword1')

    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toBe('INVALID_CURRENT_PASSWORD')
    expect(save).not.toHaveBeenCalled()
  })

  test('updates password and revokes tokens on success', async () => {
    const save = mock(async () => {})
    const revoke = mock(async () => {})
    const authRepo: IAuthRepository = {
      findById: mock(async () => mockUser),
      save,
    } as any
    const hasher: IPasswordHasher = {
      hash: mock(async () => 'new-hash'),
      verify: mock(async (_h: string, plain: string) => plain === 'OldPassword1'),
    }
    const tokenRepo: IAuthTokenRepository = {
      revokeAllByUserId: revoke,
    } as any

    const svc = new ChangePasswordService(authRepo, hasher, tokenRepo)
    const r = await svc.execute('u1', 'OldPassword1', 'NewPassword1')

    expect(r.success).toBe(true)
    expect(mockUser.withPassword).toHaveBeenCalledWith('new-hash')
    expect(save).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith('u1')
  })
})
