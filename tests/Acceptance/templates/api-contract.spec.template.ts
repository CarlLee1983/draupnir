import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../support/TestApp'

describe('[HTTP METHOD] [path]', () => {
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

  it('accepts a valid authenticated request', async () => {
    // Arrange auth and valid state.

    const res = await app.http.get('/replace-with-path')

    expect(res.status).toBe(200)
  })

  it('rejects missing or insufficient authorization', async () => {
    const res = await app.http.get('/replace-with-path')

    expect([401, 403]).toContain(res.status)
  })

  it('rejects invalid input', async () => {
    const res = await app.http.post('/replace-with-path', {
      body: {},
    })

    expect(res.status).toBe(422)
  })
})
