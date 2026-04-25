import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Auth logout revocation', () => {
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

  it('logout revokes only the current token and makes the protected route reject that token', async () => {
    const email = 'auth-logout@example.test'
    const password = 'SecurePass123'

    await app.http.post('/api/auth/register', { body: { email, password } })
    const loginRes = await app.http.post('/api/auth/login', {
      body: { email, password },
    })
    const loginJson = (await loginRes.json()) as {
      data?: { accessToken: string; refreshToken: string; user: { id: string } }
    }
    const accessToken = loginJson.data?.accessToken as string

    const logoutRes = await app.http.post('/api/auth/logout', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(logoutRes.status).toBe(200)

    const revokedSessionsRes = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(revokedSessionsRes.status).toBe(401)
    const revokedJson = (await revokedSessionsRes.json()) as { error?: string }
    expect(revokedJson.error).toBe('UNAUTHORIZED')

    const authTokenRepository = app.container.make('authTokenRepository') as {
      findRevokedByUserId(userId: string): Promise<Array<{ revokedAt?: Date }>>
    }
    const revokedRows = await authTokenRepository.findRevokedByUserId(
      loginJson.data?.user.id as string,
    )
    expect(revokedRows.length).toBeGreaterThan(0)
  })

  it('logout-all revokes every active token for the same user', async () => {
    const email = 'auth-logout-all@example.test'
    const password = 'SecurePass123'

    await app.http.post('/api/auth/register', { body: { email, password } })

    const firstLoginRes = await app.http.post('/api/auth/login', { body: { email, password } })
    const firstLoginJson = (await firstLoginRes.json()) as {
      data?: { accessToken: string; refreshToken: string; user: { id: string } }
    }

    const secondLoginRes = await app.http.post('/api/auth/login', { body: { email, password } })
    const secondLoginJson = (await secondLoginRes.json()) as {
      data?: { accessToken: string; refreshToken: string; user: { id: string } }
    }

    const logoutAllRes = await app.http.post('/api/auth/logout-all', {
      headers: { Authorization: `Bearer ${firstLoginJson.data?.accessToken as string}` },
    })
    expect(logoutAllRes.status).toBe(200)

    const revokedCheckOne = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${firstLoginJson.data?.accessToken as string}` },
    })
    const revokedCheckTwo = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${secondLoginJson.data?.accessToken as string}` },
    })
    expect(revokedCheckOne.status).toBe(401)
    expect(revokedCheckTwo.status).toBe(401)

    const authTokenRepository = app.container.make('authTokenRepository') as {
      findRevokedByUserId(userId: string): Promise<Array<{ revokedAt?: Date }>>
    }
    const revokedRows = await authTokenRepository.findRevokedByUserId(
      firstLoginJson.data?.user.id as string,
    )
    expect(revokedRows.length).toBe(4)
  })
})
