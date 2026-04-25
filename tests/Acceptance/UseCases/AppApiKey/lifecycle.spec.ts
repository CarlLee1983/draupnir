import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

const APP_KEYS_MODULE_ID = '00000000-0000-4000-8000-000000000004'
const DASHBOARD_MODULE_ID = '00000000-0000-4000-8000-000000000001'

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

async function managerHeader(app: TestApp, userId: string, email: string) {
  return app.auth.persistedBearerHeaderFor({ userId, email, role: 'manager' })
}

interface IssueResult {
  keyId: string
  rawKey: string
  gatewayKeyId: string
}

async function issueAppKey(
  app: TestApp,
  orgId: string,
  managerId: string,
  managerEmail: string,
  body: Record<string, unknown>,
): Promise<IssueResult> {
  const res = await app.http.post(`/api/organizations/${orgId}/app-keys`, {
    headers: await managerHeader(app, managerId, managerEmail),
    body,
  })
  if (res.status !== 201) {
    throw new Error(`issueAppKey expected 201 but got ${res.status}: ${await res.text()}`)
  }
  const json = (await res.json()) as {
    data?: { id?: string; rawKey?: string; gatewayKeyId?: string }
  }
  return {
    keyId: json.data?.id ?? '',
    rawKey: json.data?.rawKey ?? '',
    gatewayKeyId: json.data?.gatewayKeyId ?? '',
  }
}

describe('AppApiKey lifecycle', () => {
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

  it('manager issues an app key with manual rotation', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-issue@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'IssueOrg',
      slug: 'issue-org',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)
    await enableAppKeysModule(app, org.id, manager.id)

    const res = await app.http.post(`/api/organizations/${org.id}/app-keys`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: {
        label: 'CI Pipeline',
        scope: 'write',
        rotationPolicy: { autoRotate: false, gracePeriodHours: 12 },
        boundModuleIds: [],
      },
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data?: {
        rawKey?: string
        scope?: string
        status?: string
        rotationPolicy?: { auto_rotate?: boolean; grace_period_hours?: number }
      }
    }
    expect(body.success).toBe(true)
    expect(body.data?.rawKey?.startsWith('drp_app_')).toBe(true)
    expect(body.data?.scope).toBe('write')
    expect(body.data?.status).toBe('active')
    expect(body.data?.rotationPolicy?.auto_rotate).toBe(false)
    expect(body.data?.rotationPolicy?.grace_period_hours).toBe(12)

    const row = await app.db.table('app_api_keys').where('org_id', '=', org.id).first()
    expect(row?.status).toBe('active')
    expect(row?.bifrost_virtual_key_id).toBeTruthy()

    const createCall = app.gateway.calls.createKey[0]
    expect(createCall?.name).toBe('[App] CI Pipeline')
  })

  it('manager issues an app key with auto-rotation policy', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-auto@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'AutoOrg',
      slug: 'auto-org',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)
    await enableAppKeysModule(app, org.id, manager.id)

    const res = await app.http.post(`/api/organizations/${org.id}/app-keys`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: {
        label: 'AutoRot',
        rotationPolicy: { autoRotate: true, rotationIntervalDays: 30, gracePeriodHours: 24 },
      },
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data?: {
        rotationPolicy?: {
          auto_rotate?: boolean
          rotation_interval_days?: number | null
          grace_period_hours?: number
        }
      }
    }
    expect(body.success).toBe(true)
    expect(body.data?.rotationPolicy?.auto_rotate).toBe(true)
    expect(body.data?.rotationPolicy?.rotation_interval_days).toBe(30)
    expect(body.data?.rotationPolicy?.grace_period_hours).toBe(24)
  })

  it('manager rotates an active app key', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-rot@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'RotOrg',
      slug: 'rot-org',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)
    await enableAppKeysModule(app, org.id, manager.id)

    const issued = await issueAppKey(app, org.id, manager.id, manager.email, {
      label: 'ToRotate',
      rotationPolicy: { autoRotate: false, gracePeriodHours: 6 },
    })

    const res = await app.http.post(`/api/app-keys/${issued.keyId}/rotate`, {
      headers: await managerHeader(app, manager.id, manager.email),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data?: {
        rawKey?: string
        gatewayKeyId?: string
        isInGracePeriod?: boolean
        gracePeriodEndsAt?: string | null
      }
    }
    expect(body.success).toBe(true)
    expect(body.data?.rawKey).toBeTruthy()
    expect(body.data?.rawKey).not.toBe(issued.rawKey)
    expect(body.data?.gatewayKeyId).toBeTruthy()
    expect(body.data?.gatewayKeyId).not.toBe(issued.gatewayKeyId)
    expect(body.data?.isInGracePeriod).toBe(true)

    const row = await app.db.table('app_api_keys').where('id', '=', issued.keyId).first()
    expect(row?.previous_bifrost_virtual_key_id).toBe(issued.gatewayKeyId)
    expect(row?.grace_period_ends_at).toBeTruthy()

    expect(app.gateway.calls.createKey).toHaveLength(2)
  })

  it('manager updates scope and bound modules', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-scope@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'ScopeOrg',
      slug: 'scope-org',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)
    await enableAppKeysModule(app, org.id, manager.id)

    const issued = await issueAppKey(app, org.id, manager.id, manager.email, {
      label: 'ScopeKey',
      scope: 'read',
    })

    const res = await app.http.put(`/api/app-keys/${issued.keyId}/scope`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: {
        scope: 'admin',
        boundModuleIds: [DASHBOARD_MODULE_ID],
      },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data?: { scope?: string; boundModules?: string[] }
    }
    expect(body.success).toBe(true)
    expect(body.data?.scope).toBe('admin')
    expect(body.data?.boundModules).toEqual([DASHBOARD_MODULE_ID])

    const row = await app.db.table('app_api_keys').where('id', '=', issued.keyId).first()
    expect(row?.scope).toBe('admin')
  })

  it('manager revokes an active app key', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-revoke-app@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'RevokeOrg',
      slug: 'revoke-org-app',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)
    await enableAppKeysModule(app, org.id, manager.id)

    const issued = await issueAppKey(app, org.id, manager.id, manager.email, {
      label: 'ToRevoke',
    })

    const res = await app.http.post(`/api/app-keys/${issued.keyId}/revoke`, {
      headers: await managerHeader(app, manager.id, manager.email),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data?: { status?: string } }
    expect(body.success).toBe(true)
    expect(body.data?.status).toBe('revoked')

    const row = await app.db.table('app_api_keys').where('id', '=', issued.keyId).first()
    expect(row?.status).toBe('revoked')
    expect(row?.revoked_at).toBeTruthy()

    const deactivateCall = app.gateway.calls.updateKey.find(
      (entry) => entry.keyId === issued.gatewayKeyId && entry.request.isActive === false,
    )
    expect(deactivateCall).toBeTruthy()
  })

  it('manager fetches usage for a key', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-usage@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'UsageOrg',
      slug: 'usage-org',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)
    await enableAppKeysModule(app, org.id, manager.id)

    const issued = await issueAppKey(app, org.id, manager.id, manager.email, {
      label: 'UsageKey',
    })

    app.gateway.seedUsageStats({
      totalRequests: 12,
      totalTokens: 3400,
      totalCost: 0.42,
      avgLatency: 100,
    })

    const res = await app.http.get(
      `/api/app-keys/${issued.keyId}/usage?startDate=2026-04-01&endDate=2026-04-30`,
      { headers: await managerHeader(app, manager.id, manager.email) },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data?: { totalRequests?: number; totalTokens?: number; totalCost?: number }
    }
    expect(body.success).toBe(true)
    expect(body.data?.totalRequests).toBe(12)
    expect(body.data?.totalTokens).toBe(3400)
    expect(body.data?.totalCost).toBe(0.42)

    const usageCall = app.gateway.calls.getUsageStats[0]
    expect(usageCall?.keyIds).toContain(issued.gatewayKeyId)
    expect(usageCall?.query?.startTime).toBe('2026-04-01')
    expect(usageCall?.query?.endTime).toBe('2026-04-30')
  })
})
