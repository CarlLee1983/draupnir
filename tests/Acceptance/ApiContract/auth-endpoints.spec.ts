import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../support/TestApp'

function extractXsrfFromSetCookie(setCookie: string | null): string | null {
  if (!setCookie) return null
  for (const part of setCookie.split(/,(?=[^ ]*?=)/)) {
    const m = part.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
    if (m) {
      try {
        return decodeURIComponent(m[1])
      } catch {
        return m[1]
      }
    }
  }
  return null
}

async function csrfHandshake(app: TestApp, getPath: string): Promise<string> {
  const res = await app.http.get(getPath)
  const setCookie = res.headers.get('set-cookie')
  const token = extractXsrfFromSetCookie(setCookie)
  if (!token) throw new Error(`No XSRF-TOKEN cookie issued by ${getPath}`)
  return token
}

describe('Auth API contract', () => {
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

  it('POST /api/auth/register accepts a valid payload and rejects invalid payloads', async () => {
    const happy = await app.http.post('/api/auth/register', {
      body: { email: 'contract-register@example.test', password: 'SecurePass123' },
    })
    expect(happy.status).toBe(201)

    const invalid = await app.http.post('/api/auth/register', {
      body: { email: 'not-an-email', password: 'short' },
    })
    expect(invalid.status).toBe(422)
    const invalidJson = (await invalid.json()) as {
      success?: boolean
      error?: { code?: string; details?: Array<{ message?: string }> }
    }
    expect(invalidJson.success).toBe(false)
    expect(invalidJson.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST /api/auth/login accepts credentials and rejects invalid credentials', async () => {
    const email = 'contract-login@example.test'
    const password = 'SecurePass123'
    await app.http.post('/api/auth/register', {
      body: { email, password },
    })

    const happy = await app.http.post('/api/auth/login', {
      body: { email, password },
    })
    expect(happy.status).toBe(200)

    const invalid = await app.http.post('/api/auth/login', {
      body: { email, password: 'WrongPass123' },
    })
    expect(invalid.status).toBe(401)
    const invalidJson = (await invalid.json()) as { error?: string }
    expect(invalidJson.error).toBe('INVALID_CREDENTIALS')
  })

  it('POST /api/auth/refresh, POST /api/auth/logout, GET /api/auth/sessions, and POST /api/auth/logout-all obey the contract', async () => {
    const email = 'contract-session@example.test'
    const password = 'SecurePass123'
    await app.http.post('/api/auth/register', { body: { email, password } })

    const loginRes = await app.http.post('/api/auth/login', { body: { email, password } })
    const loginJson = (await loginRes.json()) as {
      data?: { accessToken: string; refreshToken: string; user: { id: string } }
    }
    const accessToken = loginJson.data?.accessToken as string
    const refreshToken = loginJson.data?.refreshToken as string

    const refreshHappy = await app.http.post('/api/auth/refresh', {
      body: { refreshToken },
    })
    expect(refreshHappy.status).toBe(200)

    const logoutUnauthorized = await app.http.post('/api/auth/logout')
    expect(logoutUnauthorized.status).toBe(401)

    const sessionsHappy = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(sessionsHappy.status).toBe(200)

    const logoutAllUnauthorized = await app.http.post('/api/auth/logout-all')
    expect(logoutAllUnauthorized.status).toBe(401)
  })

  it('web password reset endpoints accept valid input and reject invalid input', async () => {
    const email = 'contract-reset@example.test'
    await app.http.post('/api/auth/register', {
      body: { email, password: 'SecurePass123' },
    })

    const csrfForRequest = await csrfHandshake(app, '/forgot-password')
    const requestHappy = await app.http.post('/forgot-password', {
      body: { email },
      headers: { 'X-XSRF-TOKEN': csrfForRequest },
    })
    expect(requestHappy.status).toBe(200)

    const csrfForInvalid = await csrfHandshake(app, '/forgot-password')
    const requestInvalid = await app.http.post('/forgot-password', {
      body: { email: 'not-an-email' },
      headers: { 'X-XSRF-TOKEN': csrfForInvalid },
    })
    expect(requestInvalid.status).toBe(422)

    const resetRow = await app.db.table('password_reset_tokens').where('email', '=', email).first()
    expect(resetRow).toBeTruthy()
    if (!resetRow) throw new Error('reset row missing')
    const token = String(resetRow.id)

    const csrfForReset = await csrfHandshake(app, `/reset-password/${token}`)
    const resetHappy = await app.http.post(`/reset-password/${token}`, {
      body: { password: 'NewSecure123', passwordConfirmation: 'NewSecure123' },
      headers: { 'X-XSRF-TOKEN': csrfForReset },
    })
    expect([200, 302, 303]).toContain(resetHappy.status)

    const csrfForInvalidReset = await csrfHandshake(app, `/reset-password/${token}`)
    const resetInvalid = await app.http.post(`/reset-password/${token}`, {
      body: { password: 'short', passwordConfirmation: 'short' },
      headers: { 'X-XSRF-TOKEN': csrfForInvalidReset },
    })
    expect(resetInvalid.status).toBe(422)
  })

  it('web email verification endpoint handles valid and unknown tokens without mutating unknown state', async () => {
    const repository = app.container.make('emailVerificationRepository') as {
      create(email: string): Promise<{ token: string }>
    }
    const issued = await repository.create('contract-verify@example.test')

    const happy = await app.http.get(`/verify-email/${issued.token}`)
    expect(happy.status).toBe(200)

    const usedRow = await app.db
      .table('email_verification_tokens')
      .where('id', '=', issued.token)
      .first()
    expect(Boolean(usedRow?.used)).toBe(true)

    const unknown = await app.http.get('/verify-email/unknown-token')
    expect(unknown.status).toBe(200)

    const unknownRow = await app.db
      .table('email_verification_tokens')
      .where('id', '=', 'unknown-token')
      .first()
    expect(unknownRow).toBeFalsy()
  })

  it('admin status endpoint enforces admin authorization and validation', async () => {
    const adminEmail = 'contract-status-admin@example.test'
    const memberEmail = 'contract-status-member@example.test'
    const password = 'SecurePass123'

    const adminRegister = await app.http.post('/api/auth/register', {
      body: { email: adminEmail, password },
    })
    const adminJson = (await adminRegister.json()) as { data?: { id: string } }
    const adminId = adminJson.data?.id as string
    await app.db.table('users').where('id', '=', adminId).update({ role: 'admin' })

    const memberRegister = await app.http.post('/api/auth/register', {
      body: { email: memberEmail, password },
    })
    const memberJson = (await memberRegister.json()) as { data?: { id: string } }
    const memberId = memberJson.data?.id as string

    const adminHeaders = await app.auth.bearerHeaderFor({
      userId: adminId,
      email: adminEmail,
      role: 'admin',
    })
    const memberHeaders = await app.auth.bearerHeaderFor({
      userId: memberId,
      email: memberEmail,
      role: 'member',
    })

    const unauthenticated = await app.http.patch(`/api/users/${memberId}/status`, {
      body: { status: 'suspended' },
    })
    expect(unauthenticated.status).toBe(401)

    const forbidden = await app.http.patch(`/api/users/${memberId}/status`, {
      headers: memberHeaders,
      body: { status: 'suspended' },
    })
    expect(forbidden.status).toBe(403)

    const invalid = await app.http.patch(`/api/users/${memberId}/status`, {
      headers: adminHeaders,
      body: { status: 'paused' },
    })
    expect(invalid.status).toBe(422)

    const happy = await app.http.patch(`/api/users/${memberId}/status`, {
      headers: adminHeaders,
      body: { status: 'suspended' },
    })
    expect(happy.status).toBe(200)
  })
})
