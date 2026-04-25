import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway/errors'
import { TestApp } from '../../support/TestApp'

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

describe('Organization context repair', () => {
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

  it('prefers X-Organization-Id over the route param and repairs a missing gateway team', async () => {
    const member = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'member@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Acme',
      slug: 'acme',
    })
    await app.seed.orgMember({ orgId: org.id, userId: member.id, role: 'member' })

    const routeOrgId = crypto.randomUUID()
    const res = await app.http.get(`/api/organizations/${routeOrgId}`, {
      headers: {
        'X-Organization-Id': org.id,
        ...(await persistedHeader(app, {
          userId: member.id,
          email: member.email,
          role: 'member',
        })),
      },
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      success: boolean
      data?: { id?: string; gatewayTeamId?: string | null }
    }
    expect(json.success).toBe(true)
    expect(json.data?.id).toBe(org.id)
    expect(json.data?.gatewayTeamId).toBeTruthy()

    const updatedOrg = await app.db.table('organizations').where('id', '=', org.id).first()
    expect(updatedOrg?.gateway_team_id).toBeTruthy()
    expect(app.gateway.calls.ensureTeam).toHaveLength(1)
  })

  it('auto-resolves a manager organization from membership when no org id is present', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'manager@example.test',
      role: 'manager',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Beta',
      slug: 'beta',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)

    const res = await app.http.get('/manager/organization', {
      headers: await persistedHeader(app, {
        userId: manager.id,
        email: manager.email,
        role: 'manager',
      }),
    })

    expect(res.status).toBe(200)
  })

  it('returns 400 when a manager cannot be resolved to an organization', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'manager-no-org@example.test',
      role: 'manager',
    })

    const res = await app.http.get('/manager/organization', {
      headers: await persistedHeader(app, {
        userId: manager.id,
        email: manager.email,
        role: 'manager',
      }),
    })

    expect(res.status).toBe(400)
    const json = (await res.json()) as { error?: string }
    expect(json.error).toBe('MISSING_ORGANIZATION_ID')
  })

  it('returns 503 and stops the route when auto-repair fails', async () => {
    const member = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'repair-failure@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Gamma',
      slug: 'gamma',
    })
    await app.seed.orgMember({ orgId: org.id, userId: member.id, role: 'member' })
    app.gateway.failNext(new GatewayError('gateway offline', 'NETWORK', 0, true))

    const res = await app.http.get(`/api/organizations/${org.id}`, {
      headers: await persistedHeader(app, {
        userId: member.id,
        email: member.email,
        role: 'member',
      }),
    })

    expect(res.status).toBe(503)
    const json = (await res.json()) as { error?: string }
    expect(json.error).toBe('BIFROST_PROVISIONING_FAILED')

    const orgRow = await app.db.table('organizations').where('id', '=', org.id).first()
    expect(orgRow?.gateway_team_id).toBeNull()
  })
})
