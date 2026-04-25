import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Auth token expiry', () => {
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

  it('rejects expired access tokens and expired refresh tokens using TestClock-controlled time', async () => {
    const email = 'auth-expiry@example.test'
    const password = 'SecurePass123'

    await app.http.post('/api/auth/register', { body: { email, password } })
    const loginRes = await app.http.post('/api/auth/login', { body: { email, password } })
    expect(loginRes.status).toBe(200)
    const loginJson = (await loginRes.json()) as {
      data?: { accessToken: string; refreshToken: string }
    }
    const accessToken = loginJson.data?.accessToken as string
    const refreshToken = loginJson.data?.refreshToken as string

    const activeSessionRes = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(activeSessionRes.status).toBe(200)

    app.clock.advance(16 * 60 * 1000)

    const expiredSessionRes = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(expiredSessionRes.status).toBe(401)

    const refreshWithinSevenDaysRes = await app.http.post('/api/auth/refresh', {
      body: { refreshToken },
    })
    expect(refreshWithinSevenDaysRes.status).toBe(200)

    app.clock.advance(8 * 24 * 60 * 60 * 1000)

    const expiredRefreshRes = await app.http.post('/api/auth/refresh', {
      body: { refreshToken },
    })
    expect(expiredRefreshRes.status).toBe(401)
  })
})
