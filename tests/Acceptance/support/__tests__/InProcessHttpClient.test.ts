import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../TestApp'

describe('InProcessHttpClient', () => {
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

  it('GET /health 回 200', async () => {
    const res = await app.http.get('/health')
    expect(res.status).toBe(200)
  })

  it('未認證 POST → 401 + UNAUTHORIZED', async () => {
    const res = await app.http.post('/api/organizations/org-x/credits/topup', {
      body: { amount: '100' },
    })
    expect(res.status).toBe(401)
    const json = (await res.json()) as { error?: string }
    expect(json.error).toBe('UNAUTHORIZED')
  })

  it('帶 admin Authorization header 通過 auth + role middleware', async () => {
    const headers = app.auth.bearerHeaderFor({
      userId: 'admin-1',
      email: 'admin@e.com',
      role: 'admin',
    })
    const res = await app.http.post('/api/organizations/org-x/credits/topup', {
      body: { amount: '100' },
      headers,
    })
    expect(res.status).toBe(200)
  })
})
