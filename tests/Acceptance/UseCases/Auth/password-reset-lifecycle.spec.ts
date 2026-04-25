import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

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

describe('Auth password reset lifecycle', () => {
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

  it('requests a reset, changes the password, revokes active sessions, and rejects reused or expired tokens', async () => {
    const email = 'auth-reset@example.test'
    const oldPassword = 'OldSecure123'
    const newPassword = 'NewSecure123'

    const registerRes = await app.http.post('/api/auth/register', {
      body: { email, password: oldPassword },
    })
    expect(registerRes.status).toBe(201)

    const loginRes = await app.http.post('/api/auth/login', {
      body: { email, password: oldPassword },
    })
    expect(loginRes.status).toBe(200)
    const loginJson = (await loginRes.json()) as {
      data?: { accessToken: string; user: { id: string } }
    }
    const oldAccessToken = loginJson.data?.accessToken as string
    const userId = loginJson.data?.user.id as string

    const csrfForForgot = await csrfHandshake(app, '/forgot-password')
    const forgotRes = await app.http.post('/forgot-password', {
      body: { email },
      headers: { 'X-XSRF-TOKEN': csrfForForgot },
    })
    expect(forgotRes.status).toBe(200)

    const resetRow = await app.db
      .table('password_reset_tokens')
      .where('email', '=', email)
      .first()
    expect(resetRow).toBeTruthy()
    if (!resetRow) throw new Error('reset row missing')
    const resetToken = String(resetRow.id)

    const resetPageRes = await app.http.get(`/reset-password/${resetToken}`)
    expect(resetPageRes.status).toBe(200)
    const csrfForReset =
      extractXsrfFromSetCookie(resetPageRes.headers.get('set-cookie')) ?? csrfForForgot

    const resetRes = await app.http.post(`/reset-password/${resetToken}`, {
      body: { password: newPassword, passwordConfirmation: newPassword },
      headers: { 'X-XSRF-TOKEN': csrfForReset },
    })
    expect([200, 302, 303]).toContain(resetRes.status)

    const usedResetRow = await app.db
      .table('password_reset_tokens')
      .where('id', '=', resetToken)
      .first()
    expect(Boolean(usedResetRow?.used)).toBe(true)

    const revokedTokens = await app.db
      .table('auth_tokens')
      .where('user_id', '=', userId)
      .whereNotNull('revoked_at')
      .select()
    expect(revokedTokens.length).toBeGreaterThan(0)

    const oldSessionRes = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${oldAccessToken}` },
    })
    expect(oldSessionRes.status).toBe(401)

    const oldLoginRes = await app.http.post('/api/auth/login', {
      body: { email, password: oldPassword },
    })
    expect(oldLoginRes.status).toBe(401)

    const newLoginRes = await app.http.post('/api/auth/login', {
      body: { email, password: newPassword },
    })
    expect(newLoginRes.status).toBe(200)

    const csrfForReuse = await csrfHandshake(app, `/reset-password/${resetToken}`)
    const reusedTokenRes = await app.http.post(`/reset-password/${resetToken}`, {
      body: { password: 'AnotherSecure123', passwordConfirmation: 'AnotherSecure123' },
      headers: { 'X-XSRF-TOKEN': csrfForReuse },
    })
    expect(reusedTokenRes.status).toBe(200)

    const stillNewLoginRes = await app.http.post('/api/auth/login', {
      body: { email, password: newPassword },
    })
    expect(stillNewLoginRes.status).toBe(200)

    await app.db.table('password_reset_tokens').insert({
      id: 'expired-reset-token',
      email,
      expires_at: '2025-12-31T23:00:00.000Z',
      used: false,
    })

    const csrfForExpired = await csrfHandshake(app, '/reset-password/expired-reset-token')
    const expiredResetRes = await app.http.post('/reset-password/expired-reset-token', {
      body: { password: 'ExpiredSecure123', passwordConfirmation: 'ExpiredSecure123' },
      headers: { 'X-XSRF-TOKEN': csrfForExpired },
    })
    expect(expiredResetRes.status).toBe(200)

    const expiredRow = await app.db
      .table('password_reset_tokens')
      .where('id', '=', 'expired-reset-token')
      .first()
    expect(Boolean(expiredRow?.used)).toBe(false)
  })
})
