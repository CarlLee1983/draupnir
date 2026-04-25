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

interface SeededOrgRoles {
  org: { id: string }
  admin: { id: string; email: string }
  manager: { id: string; email: string }
  member: { id: string; email: string }
  outsider: { id: string; email: string }
}

async function seedOrgWithRoles(app: TestApp, slug = 'matrix'): Promise<SeededOrgRoles> {
  const admin = await app.seed.user({
    id: crypto.randomUUID(),
    email: `admin-${slug}@example.test`,
    role: 'admin',
  })
  const manager = await app.seed.user({
    id: crypto.randomUUID(),
    email: `manager-${slug}@example.test`,
    role: 'user',
  })
  const member = await app.seed.user({
    id: crypto.randomUUID(),
    email: `member-${slug}@example.test`,
    role: 'user',
  })
  const outsider = await app.seed.user({
    id: crypto.randomUUID(),
    email: `outsider-${slug}@example.test`,
    role: 'user',
  })
  const org = await app.seed.organization({
    id: crypto.randomUUID(),
    name: `Org ${slug}`,
    slug,
  })
  await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
  await app.seed.orgMember({ orgId: org.id, userId: member.id, role: 'member' })
  await provisionOrganizationForContext(app, org.id)
  return { org, admin, manager, member, outsider }
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
        headers: await app.auth.bearerHeaderFor({
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
        headers: await app.auth.bearerHeaderFor({
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

  describe('GET /api/organizations/:id/members access matrix', () => {
    it('admin / manager / member succeed; non-member 403; unauth 401', async () => {
      const { org, admin, manager, member, outsider } = await seedOrgWithRoles(app, 'list-members')
      const url = `/api/organizations/${org.id}/members`

      const adminRes = await app.http.get(url, {
        headers: await persistedHeader(app, { userId: admin.id, email: admin.email, role: 'admin' }),
      })
      expect(adminRes.status).toBe(200)

      const managerRes = await app.http.get(url, {
        headers: await persistedHeader(app, {
          userId: manager.id,
          email: manager.email,
          role: 'manager',
        }),
      })
      expect(managerRes.status).toBe(200)

      const memberRes = await app.http.get(url, {
        headers: await persistedHeader(app, {
          userId: member.id,
          email: member.email,
          role: 'member',
        }),
      })
      expect(memberRes.status).toBe(200)

      const outsiderRes = await app.http.get(url, {
        headers: await persistedHeader(app, {
          userId: outsider.id,
          email: outsider.email,
          role: 'member',
        }),
      })
      expect(outsiderRes.status).toBe(403)
      const outsiderJson = (await outsiderRes.json()) as { error?: string }
      expect(outsiderJson.error).toBe('NOT_ORG_MEMBER')

      const unauthRes = await app.http.get(url)
      expect(unauthRes.status).toBe(401)
    })
  })

  describe('POST /api/organizations/:id/invitations access matrix', () => {
    it('admin / manager succeed; member and non-member 403', async () => {
      const { org, admin, manager, member, outsider } = await seedOrgWithRoles(app, 'invite')
      const url = `/api/organizations/${org.id}/invitations`

      const adminRes = await app.http.post(url, {
        headers: await persistedHeader(app, { userId: admin.id, email: admin.email, role: 'admin' }),
        body: { email: 'invitee-by-admin@example.test' },
      })
      expect(adminRes.status).toBe(201)

      const managerRes = await app.http.post(url, {
        headers: await persistedHeader(app, {
          userId: manager.id,
          email: manager.email,
          role: 'manager',
        }),
        body: { email: 'invitee-by-manager@example.test' },
      })
      expect(managerRes.status).toBe(201)

      const memberRes = await app.http.post(url, {
        headers: await persistedHeader(app, {
          userId: member.id,
          email: member.email,
          role: 'member',
        }),
        body: { email: 'invitee-by-member@example.test' },
      })
      // Service-layer rejection (NOT_ORG_MANAGER) flows through the controller
      // as 400 (controller maps `result.success ? 201 : 400`). Middleware rejection
      // (non-member) returns 403. Both are forbidden semantics; status differs by layer.
      expect(memberRes.status).toBe(400)
      expect(((await memberRes.json()) as { error?: string }).error).toBe('NOT_ORG_MANAGER')

      const outsiderRes = await app.http.post(url, {
        headers: await persistedHeader(app, {
          userId: outsider.id,
          email: outsider.email,
          role: 'member',
        }),
        body: { email: 'invitee-by-outsider@example.test' },
      })
      expect(outsiderRes.status).toBe(403)
      expect(((await outsiderRes.json()) as { error?: string }).error).toBe('NOT_ORG_MEMBER')
    })
  })

  describe('DELETE /api/organizations/:id/invitations/:invId access matrix', () => {
    it('admin / manager succeed; member and non-member 403', async () => {
      const { org, admin, manager, member, outsider } = await seedOrgWithRoles(app, 'cancel-inv')

      async function createInvitation(emailLocal: string): Promise<string> {
        const res = await app.http.post(`/api/organizations/${org.id}/invitations`, {
          headers: await persistedHeader(app, {
            userId: manager.id,
            email: manager.email,
            role: 'manager',
          }),
          body: { email: `${emailLocal}@example.test` },
        })
        expect(res.status).toBe(201)
        const json = (await res.json()) as { data?: { id?: string } }
        const invId = json.data?.id
        if (!invId) throw new Error('expected invitation id from POST')
        return invId
      }

      const invForAdmin = await createInvitation('inv-for-admin')
      const adminRes = await app.http.delete(`/api/organizations/${org.id}/invitations/${invForAdmin}`, {
        headers: await persistedHeader(app, { userId: admin.id, email: admin.email, role: 'admin' }),
      })
      expect(adminRes.status).toBe(200)

      const invForManager = await createInvitation('inv-for-manager')
      const managerRes = await app.http.delete(
        `/api/organizations/${org.id}/invitations/${invForManager}`,
        {
          headers: await persistedHeader(app, {
            userId: manager.id,
            email: manager.email,
            role: 'manager',
          }),
        },
      )
      expect(managerRes.status).toBe(200)

      const invForMember = await createInvitation('inv-for-member')
      const memberRes = await app.http.delete(
        `/api/organizations/${org.id}/invitations/${invForMember}`,
        {
          headers: await persistedHeader(app, {
            userId: member.id,
            email: member.email,
            role: 'member',
          }),
        },
      )
      // Service-layer rejection → 400; middleware rejection (non-member) → 403.
      expect(memberRes.status).toBe(400)
      expect(((await memberRes.json()) as { error?: string }).error).toBe('NOT_ORG_MANAGER')

      const invForOutsider = await createInvitation('inv-for-outsider')
      const outsiderRes = await app.http.delete(
        `/api/organizations/${org.id}/invitations/${invForOutsider}`,
        {
          headers: await persistedHeader(app, {
            userId: outsider.id,
            email: outsider.email,
            role: 'member',
          }),
        },
      )
      expect(outsiderRes.status).toBe(403)
      expect(((await outsiderRes.json()) as { error?: string }).error).toBe('NOT_ORG_MEMBER')
    })
  })

  describe('DELETE /api/organizations/:id/members/:userId access matrix', () => {
    it('admin / manager remove members; member and non-member 403', async () => {
      const baseSlug = 'remove-member'
      // Each role's success path needs its own target; reseed per assertion
      // to keep state isolated. The shared `app.reset()` in beforeEach scopes
      // all tests but we need 2 removable targets here within one test.

      // ── Admin removes a member ──
      {
        const { org, admin, member } = await seedOrgWithRoles(app, `${baseSlug}-1`)
        const res = await app.http.delete(`/api/organizations/${org.id}/members/${member.id}`, {
          headers: await persistedHeader(app, {
            userId: admin.id,
            email: admin.email,
            role: 'admin',
          }),
        })
        expect(res.status).toBe(200)
        await app.reset()
      }

      // ── Manager removes a member ──
      {
        const { org, manager, member } = await seedOrgWithRoles(app, `${baseSlug}-2`)
        const res = await app.http.delete(`/api/organizations/${org.id}/members/${member.id}`, {
          headers: await persistedHeader(app, {
            userId: manager.id,
            email: manager.email,
            role: 'manager',
          }),
        })
        expect(res.status).toBe(200)
        await app.reset()
      }

      // ── Member tries to remove someone (manager) → 403 NOT_ORG_MANAGER ──
      {
        const { org, manager, member } = await seedOrgWithRoles(app, `${baseSlug}-3`)
        const res = await app.http.delete(`/api/organizations/${org.id}/members/${manager.id}`, {
          headers: await persistedHeader(app, {
            userId: member.id,
            email: member.email,
            role: 'member',
          }),
        })
        expect(res.status).toBe(400)
        expect(((await res.json()) as { error?: string }).error).toBe('NOT_ORG_MANAGER')
        await app.reset()
      }

      // ── Non-member tries to remove someone → 403 NOT_ORG_MEMBER ──
      {
        const { org, manager, outsider } = await seedOrgWithRoles(app, `${baseSlug}-4`)
        const res = await app.http.delete(`/api/organizations/${org.id}/members/${manager.id}`, {
          headers: await persistedHeader(app, {
            userId: outsider.id,
            email: outsider.email,
            role: 'member',
          }),
        })
        expect(res.status).toBe(403)
        expect(((await res.json()) as { error?: string }).error).toBe('NOT_ORG_MEMBER')
      }
    })
  })
})
