import { describe, expect, mock, test } from 'bun:test'
import type { IPasswordHasher } from '../Application/Ports/IPasswordHasher'
import { ResetPasswordService } from '../Application/Services/ResetPasswordService'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../Domain/Repositories/IAuthTokenRepository'
import type { IPasswordResetRepository } from '../Domain/Repositories/IPasswordResetRepository'
import { PasswordResetToken } from '../Domain/ValueObjects/PasswordResetToken'

describe('ResetPasswordService', () => {
  const validToken = PasswordResetToken.reconstruct(
    'valid-token-abc',
    'user@example.com',
    new Date(Date.now() + 3600000),
    false,
  )
  const expiredToken = PasswordResetToken.reconstruct(
    'expired-token',
    'user@example.com',
    new Date(Date.now() - 1000),
    false,
  )
  const usedToken = PasswordResetToken.reconstruct(
    'used-token',
    'user@example.com',
    new Date(Date.now() + 3600000),
    true,
  )
  const mockUpdatedUser = { id: 'user-1', emailValue: 'user@example.com' } as any
  const mockUser = {
    id: 'user-1',
    emailValue: 'user@example.com',
    withPassword: mock(() => mockUpdatedUser),
  } as any

  function makeTokenRepo(): IAuthTokenRepository {
    return {
      revokeAllByUserId: mock(async () => {}),
    } as any
  }

  test('resets password with valid token', async () => {
    const resetRepo: IPasswordResetRepository = {
      findByToken: mock(async () => validToken),
      markUsed: mock(async () => {}),
    } as any
    const authRepo: IAuthRepository = {
      findByEmail: mock(async () => mockUser),
      save: mock(async () => {}),
    } as any
    const hasher: IPasswordHasher = {
      hash: mock(async () => 'hashed-new-password'),
    } as any
    const tokenRepo = makeTokenRepo()

    const service = new ResetPasswordService(resetRepo, authRepo, hasher, tokenRepo)
    const result = await service.execute('valid-token-abc', 'NewPassword123!')

    expect(result.success).toBe(true)
    expect(mockUser.withPassword).toHaveBeenCalledWith('hashed-new-password')
    expect(authRepo.save).toHaveBeenCalledWith(mockUpdatedUser)
    expect(resetRepo.markUsed).toHaveBeenCalledWith('valid-token-abc')
  })

  test('revokes all active tokens for the user after a successful password reset', async () => {
    const resetRepo: IPasswordResetRepository = {
      findByToken: mock(async () => validToken),
      markUsed: mock(async () => {}),
    } as any
    const authRepo: IAuthRepository = {
      findByEmail: mock(async () => mockUser),
      save: mock(async () => {}),
    } as any
    const hasher: IPasswordHasher = {
      hash: mock(async () => 'hashed-new-password'),
    } as any
    const tokenRepo = makeTokenRepo()

    const service = new ResetPasswordService(resetRepo, authRepo, hasher, tokenRepo)
    await service.execute('valid-token-abc', 'NewPassword123!')

    expect(tokenRepo.revokeAllByUserId).toHaveBeenCalledWith('user-1')
  })

  test('does NOT revoke tokens when the token is expired', async () => {
    const resetRepo: IPasswordResetRepository = {
      findByToken: mock(async () => expiredToken),
    } as any
    const tokenRepo = makeTokenRepo()

    const service = new ResetPasswordService(resetRepo, {} as any, {} as any, tokenRepo)
    const result = await service.execute('expired-token', 'NewPassword123!')

    expect(result.success).toBe(false)
    expect(tokenRepo.revokeAllByUserId).not.toHaveBeenCalled()
  })

  test('rejects expired token', async () => {
    const resetRepo: IPasswordResetRepository = {
      findByToken: mock(async () => expiredToken),
    } as any

    const service = new ResetPasswordService(resetRepo, {} as any, {} as any, makeTokenRepo())
    const result = await service.execute('expired-token', 'NewPassword123!')

    expect(result.success).toBe(false)
    expect(result.error).toContain('過期')
  })

  test('rejects already-used token', async () => {
    const resetRepo: IPasswordResetRepository = {
      findByToken: mock(async () => usedToken),
    } as any

    const service = new ResetPasswordService(resetRepo, {} as any, {} as any, makeTokenRepo())
    const result = await service.execute('used-token', 'NewPassword123!')

    expect(result.success).toBe(false)
  })

  test('returns error for unknown token', async () => {
    const resetRepo: IPasswordResetRepository = {
      findByToken: mock(async () => null),
    } as any

    const service = new ResetPasswordService(resetRepo, {} as any, {} as any, makeTokenRepo())
    const result = await service.execute('unknown', 'NewPassword123!')

    expect(result.success).toBe(false)
  })

  test('validateToken returns valid:true for valid token', async () => {
    const resetRepo: IPasswordResetRepository = {
      findByToken: mock(async () => validToken),
    } as any

    const service = new ResetPasswordService(resetRepo, {} as any, {} as any, makeTokenRepo())
    const result = await service.validateToken('valid-token-abc')

    expect(result.valid).toBe(true)
  })
})
