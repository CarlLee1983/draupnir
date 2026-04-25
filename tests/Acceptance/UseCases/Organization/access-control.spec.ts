import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

async function provisionOrganizationForContext(app: TestApp, orgId: string): Promise<void> {
  await app.db
    .table('organizations')
    .where('id', '=', orgId)
    .update({
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

async function persistedManagerHeader(app: TestApp, userId: string, email: string) {
  return app.auth.persistedBearerHeaderFor({
    userId,
    email,
    role: 'manager',
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

  it("lets an admin list organizations but blocks a non-member from reading someone else's org", async () => {
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
    const member = await app.seed.user({
      id: 'user-2',
      email: 'member2@example.test',
      role: 'user',
    })
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
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Gamma',
      slug: 'gamma',
    })
    await provisionOrganizationForContext(app, org.id)

    const listRes = await app.http.get('/api/organizations')
    expect(listRes.status).toBe(401)

    const getRes = await app.http.get(`/api/organizations/${org.id}`)
    expect(getRes.status).toBe(401)
  })

  it('manager of Org A cannot invite into Org B (cross-tenant)', async () => {
    const managerA = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-a-tenant@example.test',
      role: 'user',
    })
    const orgA = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Org A',
      slug: 'org-a',
    })
    const orgB = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Org B',
      slug: 'org-b',
    })
    await app.seed.orgMember({ orgId: orgA.id, userId: managerA.id, role: 'manager' })
    await provisionOrganizationForContext(app, orgA.id)
    await provisionOrganizationForContext(app, orgB.id)

    const res = await app.http.post(`/api/organizations/${orgB.id}/invitations`, {
      headers: await persistedManagerHeader(app, managerA.id, managerA.email),
      body: { email: 'someone@example.test' },
    })
    expect(res.status).toBe(403)
    expect(((await res.json()) as { error?: string }).error).toBe('NOT_ORG_MEMBER')
  })

  it('member of Org A cannot list members of Org B (cross-tenant)', async () => {
    const memberA = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mem-a-tenant@example.test',
      role: 'user',
    })
    const orgA = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Org A2',
      slug: 'org-a2',
    })
    const orgB = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Org B2',
      slug: 'org-b2',
    })
    await app.seed.orgMember({ orgId: orgA.id, userId: memberA.id, role: 'member' })
    await provisionOrganizationForContext(app, orgA.id)
    await provisionOrganizationForContext(app, orgB.id)

    const res = await app.http.get(`/api/organizations/${orgB.id}/members`, {
      headers: await persistedMemberHeader(app, memberA.id, memberA.email),
    })
    expect(res.status).toBe(403)
    expect(((await res.json()) as { error?: string }).error).toBe('NOT_ORG_MEMBER')
  })

  it('manager of Org A cannot remove a member of Org B (cross-tenant)', async () => {
    const managerA = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-a-cross@example.test',
      role: 'user',
    })
    const orgB_member = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'orgb-victim@example.test',
      role: 'user',
    })
    const orgA = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Org A3',
      slug: 'org-a3',
    })
    const orgB = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Org B3',
      slug: 'org-b3',
    })
    await app.seed.orgMember({ orgId: orgA.id, userId: managerA.id, role: 'manager' })
    await app.seed.orgMember({ orgId: orgB.id, userId: orgB_member.id, role: 'member' })
    await provisionOrganizationForContext(app, orgA.id)
    await provisionOrganizationForContext(app, orgB.id)

    const res = await app.http.delete(`/api/organizations/${orgB.id}/members/${orgB_member.id}`, {
      headers: await persistedManagerHeader(app, managerA.id, managerA.email),
    })
    expect(res.status).toBe(403)
    expect(((await res.json()) as { error?: string }).error).toBe('NOT_ORG_MEMBER')
  })
})
