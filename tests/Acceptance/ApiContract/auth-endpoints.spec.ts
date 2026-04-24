import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../support/TestApp'

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
})
