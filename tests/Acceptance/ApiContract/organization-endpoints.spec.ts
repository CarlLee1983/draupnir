import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../support/TestApp'

async function provisionOrganizationForContext(app: TestApp, orgId: string): Promise<void> {
  await app.db.table('organizations').where('id', '=', orgId).update({
    gateway_team_id: `mock_team_${orgId}`,
  })
}

async function persistedHeader(
  app: TestApp,
  args: { userId: string; email: string; role: string },
): Promise<{ Authorization: string }> {
  return app.auth.persistedBearerHeaderFor(args)
}

describe('Organization API contract', () => {
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

  describe('POST /api/organizations', () => {
    it('pins success, auth failure, and validation failure', async () => {
      const creator = await app.seed.user({
        id: 'user-1',
        email: 'member@example.test',
        role: 'user',
      })

      const unauthorizedRes = await app.http.post('/api/organizations', {
        body: { name: 'NoAuth', slug: 'no-auth' },
      })
      expect(unauthorizedRes.status).toBe(401)
      const unauthorizedJson = (await unauthorizedRes.json()) as { error?: string }
      expect(unauthorizedJson.error).toBe('UNAUTHORIZED')

      const res = await app.http.post('/api/organizations', {
        headers: app.auth.bearerHeaderFor({
          userId: creator.id,
          email: creator.email,
          role: 'member',
        }),
        body: { name: 'Acme', slug: 'acme' },
      })

      expect(res.status).toBe(201)
      const json = (await res.json()) as { success: boolean; data?: { redirectTo?: string } }
      expect(json.success).toBe(true)
      expect(json.data?.redirectTo).toBe('/manager/dashboard')

      const validationRes = await app.http.post('/api/organizations', {
        headers: app.auth.bearerHeaderFor({
          userId: creator.id,
          email: creator.email,
          role: 'member',
        }),
        body: {},
      })
      expect(validationRes.status).toBe(422)
    })
  })

  describe('GET /api/organizations/:id', () => {
    it('pins admin success and auth failure', async () => {
      const admin = await app.seed.user({ id: 'admin-1', email: 'admin@example.test', role: 'admin' })
      const org = await app.seed.organization({ id: crypto.randomUUID(), name: 'Acme', slug: 'acme' })
      await provisionOrganizationForContext(app, org.id)

      const res = await app.http.get(`/api/organizations/${org.id}`, {
        headers: await persistedHeader(app, {
          userId: admin.id,
          email: admin.email,
          role: 'admin',
        }),
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as { success: boolean }
      expect(json.success).toBe(true)

      const unauthorizedRes = await app.http.get(`/api/organizations/${org.id}`)
      expect(unauthorizedRes.status).toBe(401)
    })
  })

  describe('POST /api/organizations/:id/invitations', () => {
    it('pins success and validation failure', async () => {
      const manager = await app.seed.user({
        id: 'manager-1',
        email: 'manager@example.test',
        role: 'manager',
      })
      const org = await app.seed.organization({ id: crypto.randomUUID(), name: 'Beta', slug: 'beta' })
      await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
      await provisionOrganizationForContext(app, org.id)

      const res = await app.http.post(`/api/organizations/${org.id}/invitations`, {
        headers: await persistedHeader(app, {
          userId: manager.id,
          email: manager.email,
          role: 'manager',
        }),
        body: { email: 'new.member@example.test' },
      })

      expect(res.status).toBe(201)
      const json = (await res.json()) as { success: boolean; data?: { token?: string } }
      expect(json.success).toBe(true)
      expect(json.data?.token).toBeTruthy()

      const validationRes = await app.http.post(`/api/organizations/${org.id}/invitations`, {
        headers: await persistedHeader(app, {
          userId: manager.id,
          email: manager.email,
          role: 'manager',
        }),
        body: { email: 'not-an-email' },
      })
      expect(validationRes.status).toBe(422)
    })
  })
})
