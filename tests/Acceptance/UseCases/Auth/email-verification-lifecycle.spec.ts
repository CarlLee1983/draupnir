import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { IEmailVerificationRepository } from '@/Modules/Auth/Domain/Repositories/IEmailVerificationRepository'
import { TestApp } from '../../support/TestApp'

describe('Auth email verification lifecycle', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
  })

  it('verifies an issued token once and rejects duplicate or expired verification attempts', async () => {
    const email = 'auth-verify@example.test'
    const repository = app.container.make(
      'emailVerificationRepository',
    ) as IEmailVerificationRepository

    const issued = await repository.create(email)

    const verifyRes = await app.http.get(`/verify-email/${issued.token}`)
    expect(verifyRes.status).toBe(200)

    const usedRow = await app.db
      .table('email_verification_tokens')
      .where('id', '=', issued.token)
      .first()
    expect(Boolean(usedRow?.used)).toBe(true)

    const duplicateRes = await app.http.get(`/verify-email/${issued.token}`)
    expect(duplicateRes.status).toBe(200)

    const stillUsedRow = await app.db
      .table('email_verification_tokens')
      .where('id', '=', issued.token)
      .first()
    expect(Boolean(stillUsedRow?.used)).toBe(true)

    await app.db.table('email_verification_tokens').insert({
      id: 'expired-verify-token',
      email,
      expires_at: '2025-12-31T23:00:00.000Z',
      used: false,
    })

    const expiredRes = await app.http.get('/verify-email/expired-verify-token')
    expect(expiredRes.status).toBe(200)

    const expiredRow = await app.db
      .table('email_verification_tokens')
      .where('id', '=', 'expired-verify-token')
      .first()
    expect(Boolean(expiredRow?.used)).toBe(false)
  })
})
