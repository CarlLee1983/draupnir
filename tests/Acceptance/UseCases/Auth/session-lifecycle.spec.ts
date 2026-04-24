import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Auth session lifecycle', () => {
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

  it('registers a user, creates a profile, logs in, lists the current session, and refreshes the token', async () => {
    const email = 'auth-core@example.test'
    const password = 'SecurePass123'

    const registerRes = await app.http.post('/api/auth/register', {
      body: { email, password },
    })
    expect(registerRes.status).toBe(201)

    const registerJson = (await registerRes.json()) as {
      success: boolean
      data?: { id: string; email: string; role: string }
    }
    expect(registerJson.success).toBe(true)
    expect(registerJson.data?.email).toBe(email)
    expect(registerJson.data?.role).toBe('member')

    const userId = registerJson.data?.id as string
    const profileRow = await app.db.table('user_profiles').where('user_id', '=', userId).first()
    expect(profileRow).toBeTruthy()

    const eventTypes = app.events.map((event) => event.eventType)
    expect(eventTypes).toContain('auth.user_registered')

    const loginRes = await app.http.post('/api/auth/login', {
      body: { email, password },
    })
    expect(loginRes.status).toBe(200)

    const loginJson = (await loginRes.json()) as {
      success: boolean
      data?: {
        accessToken: string
        refreshToken: string
        user: { id: string; email: string; role: string }
      }
    }
    expect(loginJson.success).toBe(true)
    expect(loginJson.data?.user.id).toBe(userId)

    const accessToken = loginJson.data?.accessToken as string
    const refreshToken = loginJson.data?.refreshToken as string

    const sessionsRes = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(sessionsRes.status).toBe(200)

    const sessionsJson = (await sessionsRes.json()) as {
      success: boolean
      sessions: Array<{ id: string; type: 'access'; isCurrent: boolean }>
    }
    expect(sessionsJson.success).toBe(true)
    expect(sessionsJson.sessions.length).toBeGreaterThan(0)
    expect(sessionsJson.sessions.some((session) => session.isCurrent)).toBe(true)

    const refreshRes = await app.http.post('/api/auth/refresh', {
      body: { refreshToken },
    })
    expect(refreshRes.status).toBe(200)

    const refreshJson = (await refreshRes.json()) as {
      success: boolean
      data?: { accessToken: string; expiresIn: number }
    }
    expect(refreshJson.success).toBe(true)
    expect(refreshJson.data?.accessToken).toBeTruthy()
    expect(refreshJson.data?.expiresIn).toBeGreaterThan(0)
  })
})
