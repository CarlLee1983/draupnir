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

async function adminHeader(app: TestApp, userId: string, email: string) {
  return app.auth.persistedBearerHeaderFor({
    userId,
    email,
    role: 'admin',
  })
}

async function managerHeader(app: TestApp, userId: string, email: string) {
  return app.auth.persistedBearerHeaderFor({
    userId,
    email,
    role: 'manager',
  })
}

describe('Organization member lifecycle', () => {
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

  it('lists members and updates a member role', async () => {
    const admin = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'admin@example.test',
      role: 'admin',
    })
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'manager@example.test',
      role: 'user',
    })
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
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await app.seed.orgMember({ orgId: org.id, userId: member.id, role: 'member' })
    await provisionOrganizationForContext(app, org.id)

    const listRes = await app.http.get(`/api/organizations/${org.id}/members`, {
      headers: await adminHeader(app, admin.id, admin.email),
    })
    expect(listRes.status).toBe(200)
    const listJson = (await listRes.json()) as {
      success: boolean
      data?: { members?: Array<{ userId: string; role: string; email: string }> }
    }
    const members = listJson.data?.members ?? []
    expect(members).toHaveLength(2)
    expect(members.find((item) => item.userId === manager.id)?.role).toBe('manager')
    expect(members.find((item) => item.userId === member.id)?.email).toBe(member.email)

    const promoteRes = await app.http.patch(
      `/api/organizations/${org.id}/members/${member.id}/role`,
      {
        headers: await adminHeader(app, admin.id, admin.email),
        body: { role: 'manager' },
      },
    )
    expect(promoteRes.status).toBe(200)
    const promoteJson = (await promoteRes.json()) as {
      success: boolean
      data?: { role?: string }
    }
    expect(promoteJson.success).toBe(true)
    expect(promoteJson.data?.role).toBe('manager')

    const promotedRow = await app.db
      .table('organization_members')
      .where('organization_id', '=', org.id)
      .where('user_id', '=', member.id)
      .first()
    expect(promotedRow?.role).toBe('manager')
  })

  it('removes a member and clears any API key assignment first', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'manager2@example.test',
      role: 'user',
    })
    const member = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'member2@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Beta',
      slug: 'beta',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await app.seed.orgMember({ orgId: org.id, userId: member.id, role: 'member' })
    await provisionOrganizationForContext(app, org.id)

    const key = await app.seed.apiKey({
      id: crypto.randomUUID(),
      orgId: org.id,
      createdByUserId: manager.id,
      label: 'Member Assigned Key',
      status: 'active',
    })
    await app.db.table('api_keys').where('id', '=', key.id).update({
      assigned_member_id: member.id,
    })

    const removeRes = await app.http.delete(`/api/organizations/${org.id}/members/${member.id}`, {
      headers: await managerHeader(app, manager.id, manager.email),
    })
    expect(removeRes.status).toBe(200)

    const removedMember = await app.db
      .table('organization_members')
      .where('organization_id', '=', org.id)
      .where('user_id', '=', member.id)
      .first()
    expect(removedMember).toBeNull()

    const updatedKey = await app.db.table('api_keys').where('id', '=', key.id).first()
    expect(updatedKey?.assigned_member_id).toBeNull()
  })

  it('refuses to demote the last manager (even for admin)', async () => {
    const admin = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'admin2@example.test',
      role: 'admin',
    })
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'manager3@example.test',
      role: 'user',
    })
    const member = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'member3@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Gamma',
      slug: 'gamma',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await app.seed.orgMember({ orgId: org.id, userId: member.id, role: 'member' })
    await provisionOrganizationForContext(app, org.id)

    // Demotion of the last manager is rejected for ALL requesters, including
    // system admin — leaving an org without any manager is never desirable.
    // Removal (admin override) is the dedicated cleanup path; covered separately
    // by 'admin can remove the last manager (cleanup path)' below.
    const demoteRes = await app.http.patch(
      `/api/organizations/${org.id}/members/${manager.id}/role`,
      {
        headers: await adminHeader(app, admin.id, admin.email),
        body: { role: 'member' },
      },
    )
    expect(demoteRes.status).toBe(400)
    const demoteJson = (await demoteRes.json()) as { error?: string }
    expect(demoteJson.error).toBe('CANNOT_DEMOTE_LAST_MANAGER')
  })

  it('manager cannot remove themselves (CANNOT_REMOVE_SELF)', async () => {
    const managerA = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-a@example.test',
      role: 'user',
    })
    const managerB = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'mgr-b@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Delta',
      slug: 'delta',
    })
    // Two managers so we don't trip CANNOT_REMOVE_LAST_MANAGER first.
    await app.seed.orgMember({ orgId: org.id, userId: managerA.id, role: 'manager' })
    await app.seed.orgMember({ orgId: org.id, userId: managerB.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)

    const res = await app.http.delete(`/api/organizations/${org.id}/members/${managerA.id}`, {
      headers: await managerHeader(app, managerA.id, managerA.email),
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error?: string }).error).toBe('CANNOT_REMOVE_SELF')
  })

  it('manager (also a system admin) cannot demote themselves (CANNOT_DEMOTE_SELF)', async () => {
    // The role-change endpoint requires system role 'admin' (via createRoleMiddleware),
    // so the realistic self-demotion attempt is from a system-admin user who is also
    // the manager of an org. Two managers in the org so we don't trip
    // CANNOT_DEMOTE_LAST_MANAGER first.
    const adminWhoManages = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'admin-mgr@example.test',
      role: 'admin',
    })
    const coManager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'co-mgr@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Epsilon',
      slug: 'epsilon',
    })
    await app.seed.orgMember({ orgId: org.id, userId: adminWhoManages.id, role: 'manager' })
    await app.seed.orgMember({ orgId: org.id, userId: coManager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)

    const res = await app.http.patch(
      `/api/organizations/${org.id}/members/${adminWhoManages.id}/role`,
      {
        headers: await adminHeader(app, adminWhoManages.id, adminWhoManages.email),
        body: { role: 'member' },
      },
    )
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error?: string }).error).toBe('CANNOT_DEMOTE_SELF')
  })

  it('admin can remove the last manager (cleanup path)', async () => {
    const admin = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'admin3@example.test',
      role: 'admin',
    })
    const lastManager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'last-mgr@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Zeta',
      slug: 'zeta',
    })
    await app.seed.orgMember({ orgId: org.id, userId: lastManager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)

    const res = await app.http.delete(`/api/organizations/${org.id}/members/${lastManager.id}`, {
      headers: await adminHeader(app, admin.id, admin.email),
    })
    expect(res.status).toBe(200)

    const stillThere = await app.db
      .table('organization_members')
      .where('organization_id', '=', org.id)
      .where('user_id', '=', lastManager.id)
      .first()
    expect(stillThere).toBeNull()

    // System role decay: ex-manager who isn't a manager elsewhere should be
    // downgraded to 'member'. Mirrors the assertion pattern from the
    // 'removes a member and clears any API key assignment first' test.
    const userRow = await app.db.table('users').where('id', '=', lastManager.id).first()
    expect(userRow?.role).toBe('member')
  })
})
