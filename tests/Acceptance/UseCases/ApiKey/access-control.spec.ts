import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

const API_KEYS_MODULE_ID = '00000000-0000-4000-8000-000000000003'

async function provisionOrganizationForContext(app: TestApp, orgId: string): Promise<void> {
  await app.db
    .table('organizations')
    .where('id', '=', orgId)
    .update({ gateway_team_id: `mock_team_${orgId}` })
}

async function enableApiKeysModule(
  app: TestApp,
  orgId: string,
  contractCreatedBy: string,
): Promise<void> {
  await app.seed.allCoreAppModules()
  await app.seed.contract({
    targetId: orgId,
    createdBy: contractCreatedBy,
    allowedModules: ['api_keys'],
  })
  await app.seed.moduleSubscription({
    orgId,
    moduleId: API_KEYS_MODULE_ID,
    status: 'active',
  })
}

async function adminHeader(app: TestApp, userId: string, email: string) {
  return app.auth.persistedBearerHeaderFor({ userId, email, role: 'admin' })
}

async function managerHeader(app: TestApp, userId: string, email: string) {
  return app.auth.persistedBearerHeaderFor({ userId, email, role: 'manager' })
}

async function memberHeader(app: TestApp, userId: string, email: string) {
  return app.auth.persistedBearerHeaderFor({ userId, email, role: 'member' })
}

describe('ApiKey access control', () => {
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

  it('returns 401 on protected routes when unauthenticated', async () => {
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'NoAuthOrg',
      slug: 'no-auth-org',
    })
    await provisionOrganizationForContext(app, org.id)

    const listRes = await app.http.get(`/api/organizations/${org.id}/keys`)
    expect(listRes.status).toBe(401)

    const revokeRes = await app.http.post(`/api/keys/${crypto.randomUUID()}/revoke`)
    expect(revokeRes.status).toBe(401)
  })

  it('non-admin manager without subscription gets MODULE_ACCESS_DENIED', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-no-sub@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'NoSub',
      slug: 'no-sub',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)
    // Intentionally NO module-subscription seeding.

    const res = await app.http.post(`/api/organizations/${org.id}/keys`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: { label: 'Should Not Pass' },
    })

    expect(res.status).toBe(403)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe('MODULE_ACCESS_DENIED')
  })

  it('admin bypasses module access on the create endpoint', async () => {
    const admin = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'admin-bypass@example.test',
      role: 'admin',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'AdminOrg',
      slug: 'admin-org',
    })
    await provisionOrganizationForContext(app, org.id)
    // No module-subscription / contract seeded; admin should still pass.

    const res = await app.http.post(`/api/organizations/${org.id}/keys`, {
      headers: await adminHeader(app, admin.id, admin.email),
      body: { label: 'Admin Key' },
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('manager of org A cannot create keys in org B', async () => {
    const managerA = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-a@example.test',
      role: 'user',
    })
    const orgA = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'OrgA',
      slug: 'org-a-cross',
    })
    const orgB = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'OrgB',
      slug: 'org-b-cross',
    })
    await app.seed.orgMember({ orgId: orgA.id, userId: managerA.id, role: 'manager' })
    await provisionOrganizationForContext(app, orgA.id)
    await provisionOrganizationForContext(app, orgB.id)
    await enableApiKeysModule(app, orgB.id, managerA.id)

    const res = await app.http.post(`/api/organizations/${orgB.id}/keys`, {
      headers: await managerHeader(app, managerA.id, managerA.email),
      body: { label: 'Should Be Denied' },
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe('NOT_ORG_MEMBER')
  })

  it('manager of org A cannot revoke a key from org B', async () => {
    const managerA = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-a-revoke@example.test',
      role: 'user',
    })
    const managerB = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-b-revoke@example.test',
      role: 'user',
    })
    const orgA = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'OrgA-R',
      slug: 'org-a-revoke',
    })
    const orgB = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'OrgB-R',
      slug: 'org-b-revoke',
    })
    await app.seed.orgMember({ orgId: orgA.id, userId: managerA.id, role: 'manager' })
    await app.seed.orgMember({ orgId: orgB.id, userId: managerB.id, role: 'manager' })
    await provisionOrganizationForContext(app, orgA.id)
    await provisionOrganizationForContext(app, orgB.id)

    const seededB = await app.seed.apiKey({
      id: crypto.randomUUID(),
      orgId: orgB.id,
      createdByUserId: managerB.id,
      label: 'OrgB Key',
      status: 'active',
    })

    const res = await app.http.post(`/api/keys/${seededB.id}/revoke`, {
      headers: await managerHeader(app, managerA.id, managerA.email),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe('NOT_ORG_MEMBER')

    const row = await app.db.table('api_keys').where('id', '=', seededB.id).first()
    expect(row?.status).toBe('active')
  })

  it('outsider listing another org returns NOT_ORG_MEMBER in body', async () => {
    const outsider = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'outsider@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'PrivateOrg',
      slug: 'private-org',
    })
    await provisionOrganizationForContext(app, org.id)
    await enableApiKeysModule(app, org.id, outsider.id)

    const res = await app.http.get(`/api/organizations/${org.id}/keys`, {
      headers: await memberHeader(app, outsider.id, outsider.email),
    })

    const body = (await res.json()) as { success: boolean; error?: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('NOT_ORG_MEMBER')
  })
})
