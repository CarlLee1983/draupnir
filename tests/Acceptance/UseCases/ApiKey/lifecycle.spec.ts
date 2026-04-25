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

describe('ApiKey lifecycle', () => {
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

  it('manager creates an API key for their org', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Acme',
      slug: 'acme',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)
    await enableApiKeysModule(app, org.id, manager.id)

    const res = await app.http.post(`/api/organizations/${org.id}/keys`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: {
        label: 'Production Key',
        allowedModels: ['gpt-4o'],
        rateLimitRpm: 60,
        rateLimitTpm: 90000,
      },
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data?: { rawKey?: string; status?: string; scope?: { allowed_models?: string[] | null } }
    }
    expect(body.success).toBe(true)
    expect(typeof body.data?.rawKey).toBe('string')
    expect(body.data?.rawKey?.length).toBeGreaterThan(0)
    expect(body.data?.status).toBe('active')
    expect(body.data?.scope?.allowed_models).toContain('gpt-4o')

    const row = await app.db.table('api_keys').where('org_id', '=', org.id).first()
    expect(row?.status).toBe('active')
    expect(row?.bifrost_virtual_key_id).toBeTruthy()

    const calls = app.gateway.calls
    expect(calls.createKey).toHaveLength(1)
    expect(calls.createKey[0]?.teamId).toBe(`mock_team_${org.id}`)

    const permissionUpdate = calls.updateKey.find((entry) => entry.request.providerConfigs != null)
    expect(permissionUpdate).toBeTruthy()
    expect(permissionUpdate?.request.providerConfigs?.[0]?.allowedModels).toContain('gpt-4o')
  })

  it('manager lists keys for their org', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-list@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Gamma',
      slug: 'gamma',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)
    await enableApiKeysModule(app, org.id, manager.id)

    await app.seed.apiKey({
      id: crypto.randomUUID(),
      orgId: org.id,
      createdByUserId: manager.id,
      label: 'Active Key',
      status: 'active',
    })
    await app.seed.apiKey({
      id: crypto.randomUUID(),
      orgId: org.id,
      createdByUserId: manager.id,
      label: 'Suspended Key',
      status: 'suspended_no_credit',
    })

    const res = await app.http.get(`/api/organizations/${org.id}/keys`, {
      headers: await managerHeader(app, manager.id, manager.email),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data?: { keys?: Array<{ status: string; label: string }> }
    }
    expect(body.success).toBe(true)
    expect(body.data?.keys ?? []).toHaveLength(2)
    const statuses = (body.data?.keys ?? []).map((k) => k.status).sort()
    expect(statuses).toEqual(['active', 'suspended_no_credit'])
  })

  it('manager revokes an active key', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-revoke@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Delta',
      slug: 'delta',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)

    const seeded = await app.seed.apiKey({
      id: crypto.randomUUID(),
      orgId: org.id,
      createdByUserId: manager.id,
      label: 'Live Key',
      status: 'active',
    })

    const res = await app.http.post(`/api/keys/${seeded.id}/revoke`, {
      headers: await managerHeader(app, manager.id, manager.email),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data?: { status?: string } }
    expect(body.success).toBe(true)
    expect(body.data?.status).toBe('revoked')

    const row = await app.db.table('api_keys').where('id', '=', seeded.id).first()
    expect(row?.status).toBe('revoked')
    expect(row?.revoked_at).toBeTruthy()

    const deactivateCall = app.gateway.calls.updateKey.find(
      (entry) => entry.keyId === seeded.gatewayKeyId && entry.request.isActive === false,
    )
    expect(deactivateCall).toBeTruthy()
  })

  it('revoking a key twice returns ALREADY_REVOKED', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-revoke2@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Epsilon',
      slug: 'epsilon',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)

    const seeded = await app.seed.apiKey({
      id: crypto.randomUUID(),
      orgId: org.id,
      createdByUserId: manager.id,
      label: 'Already Dead',
      status: 'revoked',
    })

    const res = await app.http.post(`/api/keys/${seeded.id}/revoke`, {
      headers: await managerHeader(app, manager.id, manager.email),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe('ALREADY_REVOKED')
  })

  it('manager updates a key label', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-label@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Zeta',
      slug: 'zeta',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)

    const seeded = await app.seed.apiKey({
      id: crypto.randomUUID(),
      orgId: org.id,
      createdByUserId: manager.id,
      label: 'Old Label',
      status: 'active',
    })

    const res = await app.http.patch(`/api/keys/${seeded.id}/label`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: { label: 'New Label' },
    })

    expect(res.status).toBe(200)
    const row = await app.db.table('api_keys').where('id', '=', seeded.id).first()
    expect(row?.label).toBe('New Label')
  })

  it('manager narrows key permissions to a smaller model list', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-perms@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Eta',
      slug: 'eta',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)

    const seeded = await app.seed.apiKey({
      id: crypto.randomUUID(),
      orgId: org.id,
      createdByUserId: manager.id,
      label: 'Perms Key',
      status: 'active',
      scope: { allowedModels: ['*'] },
    })

    const res = await app.http.put(`/api/keys/${seeded.id}/permissions`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: {
        allowedModels: ['gpt-4o-mini'],
        rateLimitRpm: 30,
        rateLimitTpm: 60000,
      },
    })

    expect(res.status).toBe(200)

    const updateCalls = app.gateway.calls.updateKey.filter(
      (entry) => entry.keyId === seeded.gatewayKeyId,
    )
    const permissionUpdate = updateCalls.find((entry) => entry.request.providerConfigs != null)
    expect(permissionUpdate?.request.providerConfigs?.[0]?.allowedModels).toContain('gpt-4o-mini')
  })

  it('admin can revoke any org key without membership', async () => {
    const admin = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'admin-revoke@example.test',
      role: 'admin',
    })
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-other@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Theta',
      slug: 'theta',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)

    const seeded = await app.seed.apiKey({
      id: crypto.randomUUID(),
      orgId: org.id,
      createdByUserId: manager.id,
      label: 'Manager Key',
      status: 'active',
    })

    const res = await app.http.post(`/api/keys/${seeded.id}/revoke`, {
      headers: await adminHeader(app, admin.id, admin.email),
    })

    expect(res.status).toBe(200)
    const row = await app.db.table('api_keys').where('id', '=', seeded.id).first()
    expect(row?.status).toBe('revoked')
  })
})
