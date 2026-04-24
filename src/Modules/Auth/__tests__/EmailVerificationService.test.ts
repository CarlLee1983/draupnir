import { describe, expect, mock, test } from 'bun:test'
import { EmailVerificationService } from '../Application/Services/EmailVerificationService'
import type { IEmailVerificationRepository } from '../Domain/Repositories/IEmailVerificationRepository'
import { EmailVerificationToken } from '../Domain/ValueObjects/EmailVerificationToken'

describe('EmailVerificationService', () => {
  const validToken = EmailVerificationToken.reconstruct(
    'valid-verify-token',
    'user@example.com',
    new Date(Date.now() + 86400000),
    false,
  )
  const expiredToken = EmailVerificationToken.reconstruct(
    'expired-verify',
    'user@example.com',
    new Date(Date.now() - 1000),
    false,
  )

  test('verifies email with valid token', async () => {
    const repo: IEmailVerificationRepository = {
      findByToken: mock(async () => validToken),
      markUsed: mock(async () => {}),
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    } as any

    const service = new EmailVerificationService(repo)
    const result = await service.execute('valid-verify-token')

    expect(result.success).toBe(true)
    expect(result.redirectUrl).toBe('/member/dashboard')
    expect(repo.markUsed).toHaveBeenCalledWith('valid-verify-token')
  })

  test('rejects expired token', async () => {
    const repo: IEmailVerificationRepository = {
      findByToken: mock(async () => expiredToken),
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    } as any

    const service = new EmailVerificationService(repo)
    const result = await service.execute('expired-verify')

    expect(result.success).toBe(false)
  })

  test('rejects unknown token', async () => {
    const repo: IEmailVerificationRepository = {
      findByToken: mock(async () => null),
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    } as any

    const service = new EmailVerificationService(repo)
    const result = await service.execute('unknown')

    expect(result.success).toBe(false)
  })
})
