import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

const APP_KEYS_MODULE_ID = '00000000-0000-4000-8000-000000000004'

async function provisionOrganizationForContext(app: TestApp, orgId: string): Promise<void> {
  await app.db
    .table('organizations')
    .where('id', '=', orgId)
    .update({ gateway_team_id: `mock_team_${orgId}` })
}

async function enableAppKeysModule(
  app: TestApp,
  orgId: string,
  contractCreatedBy: string,
): Promise<void> {
  await app.seed.allCoreAppModules()
  await app.seed.contract({
    targetId: orgId,
    createdBy: contractCreatedBy,
    allowedModules: ['app_api_keys'],
  })
  await app.seed.moduleSubscription({
    orgId,
    moduleId: APP_KEYS_MODULE_ID,
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

interface IssueResult {
  keyId: string
  gatewayKeyId: string
}

async function issueAppKeyAsManager(
  app: TestApp,
  orgId: string,
  managerId: string,
  managerEmail: string,
  label = 'TestKey',
): Promise<IssueResult> {
  const res = await app.http.post(`/api/organizations/${orgId}/app-keys`, {
    headers: await managerHeader(app, managerId, managerEmail),
    body: { label },
  })
  if (res.status !== 201) {
    throw new Error(`issueAppKey expected 201 but got ${res.status}: ${await res.text()}`)
  }
  const json = (await res.json()) as {
    data?: { id?: string; gatewayKeyId?: string }
  }
  return { keyId: json.data?.id ?? '', gatewayKeyId: json.data?.gatewayKeyId ?? '' }
}

describe('AppApiKey access control', () => {
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
      name: 'NoAuthAppOrg',
      slug: 'no-auth-app',
    })
    await provisionOrganizationForContext(app, org.id)

    const issueRes = await app.http.post(`/api/organizations/${org.id}/app-keys`, {
      body: { label: 'X' },
    })
    expect(issueRes.status).toBe(401)

    const rotateRes = await app.http.post(`/api/app-keys/${crypto.randomUUID()}/rotate`)
    expect(rotateRes.status).toBe(401)

    const usageRes = await app.http.get(`/api/app-keys/${crypto.randomUUID()}/usage`)
    expect(usageRes.status).toBe(401)
  })

  it('non-admin manager without subscription gets MODULE_ACCESS_DENIED', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-no-app-sub@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'NoAppSub',
      slug: 'no-app-sub',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)
    // No module subscription seeded.

    const res = await app.http.post(`/api/organizations/${org.id}/app-keys`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: { label: 'Should Not Pass' },
    })

    expect(res.status).toBe(403)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe('MODULE_ACCESS_DENIED')
  })

  it('non-manager member cannot issue an app key', async () => {
    const member = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'member-issue@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'MemberOrg',
      slug: 'member-org',
    })
    await app.seed.orgMember({ orgId: org.id, userId: member.id, role: 'member' })
    await provisionOrganizationForContext(app, org.id)
    await enableAppKeysModule(app, org.id, member.id)

    const res = await app.http.post(`/api/organizations/${org.id}/app-keys`, {
      headers: await memberHeader(app, member.id, member.email),
      body: { label: 'NoMemberCanIssue' },
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe('NOT_ORG_MANAGER')
  })

  it('member cannot rotate, revoke, or set scope on an existing key', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-mixed@example.test',
      role: 'user',
    })
    const member = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'member-mixed@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'MixedOrg',
      slug: 'mixed-org',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await app.seed.orgMember({ orgId: org.id, userId: member.id, role: 'member' })
    await provisionOrganizationForContext(app, org.id)
    await enableAppKeysModule(app, org.id, manager.id)

    const issued = await issueAppKeyAsManager(app, org.id, manager.id, manager.email, 'MixedKey')

    const rotateRes = await app.http.post(`/api/app-keys/${issued.keyId}/rotate`, {
      headers: await memberHeader(app, member.id, member.email),
    })
    expect(((await rotateRes.json()) as { error?: string }).error).toBe('NOT_ORG_MANAGER')

    const revokeRes = await app.http.post(`/api/app-keys/${issued.keyId}/revoke`, {
      headers: await memberHeader(app, member.id, member.email),
    })
    expect(((await revokeRes.json()) as { error?: string }).error).toBe('NOT_ORG_MANAGER')

    const scopeRes = await app.http.put(`/api/app-keys/${issued.keyId}/scope`, {
      headers: await memberHeader(app, member.id, member.email),
      body: { scope: 'admin' },
    })
    expect(((await scopeRes.json()) as { error?: string }).error).toBe('NOT_ORG_MANAGER')
  })

  it('member can list app keys and view usage', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-shared@example.test',
      role: 'user',
    })
    const member = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'member-list@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'SharedOrg',
      slug: 'shared-org',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await app.seed.orgMember({ orgId: org.id, userId: member.id, role: 'member' })
    await provisionOrganizationForContext(app, org.id)
    await enableAppKeysModule(app, org.id, manager.id)

    const issued = await issueAppKeyAsManager(app, org.id, manager.id, manager.email, 'SharedKey')

    const listRes = await app.http.get(`/api/organizations/${org.id}/app-keys`, {
      headers: await memberHeader(app, member.id, member.email),
    })
    expect(listRes.status).toBe(200)
    const listBody = (await listRes.json()) as {
      success: boolean
      data?: { keys?: Array<{ id: string }> }
    }
    expect(listBody.success).toBe(true)
    expect((listBody.data?.keys ?? []).some((k) => k.id === issued.keyId)).toBe(true)

    const usageRes = await app.http.get(`/api/app-keys/${issued.keyId}/usage`, {
      headers: await memberHeader(app, member.id, member.email),
    })
    expect(usageRes.status).toBe(200)
    expect(((await usageRes.json()) as { success: boolean }).success).toBe(true)
  })

  it('manager of org A cannot rotate an app key from org B', async () => {
    const managerA = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-a-app@example.test',
      role: 'user',
    })
    const managerB = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-b-app@example.test',
      role: 'user',
    })
    const orgA = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'OrgA-App',
      slug: 'org-a-app',
    })
    const orgB = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'OrgB-App',
      slug: 'org-b-app',
    })
    await app.seed.orgMember({ orgId: orgA.id, userId: managerA.id, role: 'manager' })
    await app.seed.orgMember({ orgId: orgB.id, userId: managerB.id, role: 'manager' })
    await provisionOrganizationForContext(app, orgA.id)
    await provisionOrganizationForContext(app, orgB.id)
    await enableAppKeysModule(app, orgB.id, managerB.id)

    const issued = await issueAppKeyAsManager(app, orgB.id, managerB.id, managerB.email, 'OrgBKey')

    const res = await app.http.post(`/api/app-keys/${issued.keyId}/rotate`, {
      headers: await managerHeader(app, managerA.id, managerA.email),
    })
    const body = (await res.json()) as { error?: string }
    // requireOrgManager returns NOT_ORG_MEMBER (not NOT_ORG_MANAGER) when the
    // caller has no membership in the target org at all.
    expect(body.error).toBe('NOT_ORG_MEMBER')
  })

  it('admin can rotate and revoke any org app key', async () => {
    const admin = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'admin-app@example.test',
      role: 'admin',
    })
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-admin-bypass@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'AdminAppOrg',
      slug: 'admin-app-org',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)
    await enableAppKeysModule(app, org.id, manager.id)

    const issued = await issueAppKeyAsManager(app, org.id, manager.id, manager.email, 'AdminCtrl')

    const rotateRes = await app.http.post(`/api/app-keys/${issued.keyId}/rotate`, {
      headers: await adminHeader(app, admin.id, admin.email),
    })
    expect(rotateRes.status).toBe(200)

    const revokeRes = await app.http.post(`/api/app-keys/${issued.keyId}/revoke`, {
      headers: await adminHeader(app, admin.id, admin.email),
    })
    expect(revokeRes.status).toBe(200)
  })
})
