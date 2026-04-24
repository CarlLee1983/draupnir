import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../TestApp'

describe('TestAuth', () => {
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

  it('tokenFor 簽出可被 jwtTokenService.verify 還原的 access token', () => {
    const token = app.auth.tokenFor({
      userId: 'user-1',
      email: 'user-1@example.com',
      role: 'user',
    })

    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(20)

    const jwt = app.container.make('jwtTokenService') as {
      verify(t: string): { userId: string; role: string; email: string } | null
    }
    const payload = jwt.verify(token)
    expect(payload).not.toBeNull()
    expect(payload?.userId).toBe('user-1')
    expect(payload?.role).toBe('user')
    expect(payload?.email).toBe('user-1@example.com')
  })

  it('bearerHeaderFor 回傳 { Authorization: "Bearer <token>" }', () => {
    const headers = app.auth.bearerHeaderFor({
      userId: 'user-2',
      email: 'u2@example.com',
      role: 'admin',
    })
    expect(headers.Authorization).toMatch(/^Bearer .+/)
  })

  it('permissions 預設為 [],可由參數覆寫', () => {
    const jwt = app.container.make('jwtTokenService') as {
      verify(t: string): { permissions: string[] } | null
    }

    const tokenA = app.auth.tokenFor({ userId: 'a', email: 'a@e.com', role: 'user' })
    expect(jwt.verify(tokenA)?.permissions).toEqual([])

    const tokenB = app.auth.tokenFor({
      userId: 'b',
      email: 'b@e.com',
      role: 'user',
      permissions: ['credit.read'],
    })
    expect(jwt.verify(tokenB)?.permissions).toEqual(['credit.read'])
  })
})
