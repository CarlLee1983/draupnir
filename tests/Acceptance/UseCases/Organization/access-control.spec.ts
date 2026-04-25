import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

async function provisionOrganizationForContext(app: TestApp, orgId: string): Promise<void> {
  await app.db.table('organizations').where('id', '=', orgId).update({
    gateway_team_id: `mock_team_${orgId}`,
  })
}

async function persistedAdminHeader(app: TestApp, userId: string, email: string) {
  return app.auth.persistedBearerHeaderFor({
    userId,
    email,
    role: 'admin',
  })
}

async function persistedMemberHeader(app: TestApp, userId: string, email: string) {
  return app.auth.persistedBearerHeaderFor({
    userId,
    email,
    role: 'member',
  })
}

describe('Organization access control', () => {
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

  it('lets an admin list organizations but blocks a non-member from reading someone else\'s org', async () => {
    const admin = await app.seed.user({ id: 'admin-1', email: 'admin@example.test', role: 'admin' })
    const member = await app.seed.user({ id: 'user-1', email: 'member@example.test', role: 'user' })
    const org = await app.seed.organization({ id: crypto.randomUUID(), name: 'Acme', slug: 'acme' })
    await app.seed.orgMember({ orgId: org.id, userId: member.id, role: 'member' })
    await provisionOrganizationForContext(app, org.id)

    const listRes = await app.http.get('/api/organizations', {
      headers: await persistedAdminHeader(app, admin.id, admin.email),
    })
    expect(listRes.status).toBe(200)

    const getRes = await app.http.get(`/api/organizations/${org.id}`, {
      headers: await persistedAdminHeader(app, admin.id, admin.email),
    })
    expect(getRes.status).toBe(200)

    const forbiddenRes = await app.http.get(`/api/organizations/${org.id}`, {
      headers: await persistedMemberHeader(app, 'outsider-1', 'outsider@example.test'),
    })
    expect(forbiddenRes.status).toBe(403)
    const forbiddenJson = (await forbiddenRes.json()) as { error?: string }
    expect(forbiddenJson.error).toBe('NOT_ORG_MEMBER')
  })

  it('blocks members from updating organizations and changing status', async () => {
    const member = await app.seed.user({ id: 'user-2', email: 'member2@example.test', role: 'user' })
    const org = await app.seed.organization({ id: crypto.randomUUID(), name: 'Beta', slug: 'beta' })
    await app.seed.orgMember({ orgId: org.id, userId: member.id, role: 'member' })
    await provisionOrganizationForContext(app, org.id)

    const updateRes = await app.http.put(`/api/organizations/${org.id}`, {
      headers: await persistedMemberHeader(app, member.id, member.email),
      body: { name: 'Beta v2', description: 'updated' },
    })
    expect(updateRes.status).toBe(403)

    const statusRes = await app.http.patch(`/api/organizations/${org.id}/status`, {
      headers: await persistedMemberHeader(app, member.id, member.email),
      body: { status: 'suspended' },
    })
    expect(statusRes.status).toBe(403)
  })

  it('returns 401 when auth is missing on protected routes', async () => {
    const org = await app.seed.organization({ id: crypto.randomUUID(), name: 'Gamma', slug: 'gamma' })
    await provisionOrganizationForContext(app, org.id)

    const listRes = await app.http.get('/api/organizations')
    expect(listRes.status).toBe(401)

    const getRes = await app.http.get(`/api/organizations/${org.id}`)
    expect(getRes.status).toBe(401)
  })
})
