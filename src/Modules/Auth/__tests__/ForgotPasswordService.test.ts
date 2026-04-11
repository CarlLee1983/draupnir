import { describe, expect, mock, test } from 'bun:test'
import { ForgotPasswordService } from '../Application/Services/ForgotPasswordService'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import type { IPasswordResetRepository } from '../Domain/Repositories/IPasswordResetRepository'
import type { IEmailService } from '../Application/Ports/IEmailService'
import { PasswordResetToken } from '../Domain/ValueObjects/PasswordResetToken'

function makeToken(email: string) {
  return PasswordResetToken.create(email)
}

describe('ForgotPasswordService', () => {
  test('sends reset email when user exists', async () => {
    const mockUser = { emailValue: 'user@example.com' } as any
    const authRepo: IAuthRepository = {
      findByEmail: mock(async () => mockUser),
    } as any
    const resetRepo: IPasswordResetRepository = {
      create: mock(async (email: string) => makeToken(email)),
    } as any
    const emailService: IEmailService = {
      sendPasswordReset: mock(async () => {}),
    } as any

    const service = new ForgotPasswordService(authRepo, resetRepo, emailService, 'http://localhost:3000')
    const result = await service.execute('user@example.com')

    expect(result.success).toBe(true)
    expect(emailService.sendPasswordReset).toHaveBeenCalled()
  })

  test('returns success even when user does not exist (anti-enumeration)', async () => {
    const authRepo: IAuthRepository = {
      findByEmail: mock(async () => null),
    } as any
    const resetRepo: IPasswordResetRepository = {
      create: mock(async (email: string) => makeToken(email)),
    } as any
    const emailService: IEmailService = {
      sendPasswordReset: mock(async () => {}),
    } as any

    const service = new ForgotPasswordService(authRepo, resetRepo, emailService, 'http://localhost:3000')
    const result = await service.execute('unknown@example.com')

    expect(result.success).toBe(true)
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled()
  })
})
