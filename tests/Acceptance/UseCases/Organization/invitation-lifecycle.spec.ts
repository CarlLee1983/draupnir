import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

async function provisionOrganizationForContext(app: TestApp, orgId: string): Promise<void> {
  await app.db.table('organizations').where('id', '=', orgId).update({
    gateway_team_id: `mock_team_${orgId}`,
  })
}

async function managerHeader(app: TestApp, userId: string, email: string) {
  return app.auth.persistedBearerHeaderFor({
    userId,
    email,
    role: 'manager',
  })
}

async function memberHeader(app: TestApp, userId: string, email: string) {
  return app.auth.persistedBearerHeaderFor({
    userId,
    email,
    role: 'member',
  })
}

describe('Organization invitation lifecycle', () => {
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

  it('replaces a pending invite for the same email, lists it, and allows cancellation', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'manager@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Acme',
      slug: 'acme',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)

    const email = 'new.member@example.test'
    const firstInviteRes = await app.http.post(`/api/organizations/${org.id}/invitations`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: { email },
    })
    expect(firstInviteRes.status).toBe(201)
    const firstInviteJson = (await firstInviteRes.json()) as {
      success: boolean
      data?: { id?: string; token?: string; email?: string; status?: string }
    }
    const firstInviteId = firstInviteJson.data?.id ?? ''
    expect(firstInviteJson.data?.status).toBe('pending')

    const secondInviteRes = await app.http.post(`/api/organizations/${org.id}/invitations`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: { email: email.toUpperCase() },
    })
    expect(secondInviteRes.status).toBe(201)
    const secondInviteJson = (await secondInviteRes.json()) as {
      success: boolean
      data?: { id?: string; token?: string; email?: string; status?: string }
    }
    const secondInviteId = secondInviteJson.data?.id ?? ''
    expect(secondInviteJson.data?.email).toBe(email)
    expect(secondInviteJson.data?.status).toBe('pending')

    const listRes = await app.http.get(`/api/organizations/${org.id}/invitations`, {
      headers: await managerHeader(app, manager.id, manager.email),
    })
    expect(listRes.status).toBe(200)
    const listJson = (await listRes.json()) as {
      success: boolean
      data?: { invitations?: Array<{ id: string; email: string; status: string }> }
    }
    const invitations = listJson.data?.invitations ?? []
    expect(invitations.filter((invite) => invite.email === email)).toHaveLength(2)
    expect(invitations.find((invite) => invite.id === firstInviteId)?.status).toBe('cancelled')
    expect(invitations.find((invite) => invite.id === secondInviteId)?.status).toBe('pending')

    const cancelRes = await app.http.delete(
      `/api/organizations/${org.id}/invitations/${secondInviteId}`,
      {
        headers: await managerHeader(app, manager.id, manager.email),
      },
    )
    expect(cancelRes.status).toBe(200)

    const afterCancelRes = await app.http.get(`/api/organizations/${org.id}/invitations`, {
      headers: await managerHeader(app, manager.id, manager.email),
    })
    expect(afterCancelRes.status).toBe(200)
    const afterCancelJson = (await afterCancelRes.json()) as {
      success: boolean
      data?: { invitations?: Array<{ id: string; status: string }> }
    }
    const pendingAfterCancel =
      afterCancelJson.data?.invitations?.filter((invite) => invite.status === 'pending') ?? []
    expect(pendingAfterCancel).toHaveLength(0)
  })

  it('accepts an invite by token and creates the membership', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'manager2@example.test',
      role: 'user',
    })
    const invited = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'new.member2@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Beta',
      slug: 'beta',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)

    const inviteRes = await app.http.post(`/api/organizations/${org.id}/invitations`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: { email: invited.email },
    })
    expect(inviteRes.status).toBe(201)
    const inviteJson = (await inviteRes.json()) as {
      success: boolean
      data?: { id?: string; token?: string }
    }
    const inviteToken = inviteJson.data?.token ?? ''
    const inviteId = inviteJson.data?.id ?? ''

    const acceptRes = await app.http.post(`/api/invitations/${inviteToken}/accept`, {
      headers: await memberHeader(app, invited.id, invited.email),
      body: { token: inviteToken },
    })
    expect(acceptRes.status).toBe(200)
    const acceptJson = (await acceptRes.json()) as { success: boolean; data?: { role?: string } }
    expect(acceptJson.success).toBe(true)

    const memberRow = await app.db
      .table('organization_members')
      .where('organization_id', '=', org.id)
      .where('user_id', '=', invited.id)
      .first()
    expect(memberRow?.role).toBe('member')

    const invitationRow = await app.db
      .table('organization_invitations')
      .where('id', '=', inviteId)
      .first()
    expect(invitationRow?.status).toBe('accepted')
  })

  it('accepts an invite by id and declines a separate invite', async () => {
    const manager = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'manager3@example.test',
      role: 'user',
    })
    const acceptedUser = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'accepted@example.test',
      role: 'user',
    })
    const declinedUser = await app.seed.user({
      id: crypto.randomUUID(),
      email: 'declined@example.test',
      role: 'user',
    })
    const org = await app.seed.organization({
      id: crypto.randomUUID(),
      name: 'Gamma',
      slug: 'gamma',
    })
    await app.seed.orgMember({ orgId: org.id, userId: manager.id, role: 'manager' })
    await provisionOrganizationForContext(app, org.id)

    const acceptInviteRes = await app.http.post(`/api/organizations/${org.id}/invitations`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: { email: acceptedUser.email },
    })
    const acceptInviteJson = (await acceptInviteRes.json()) as {
      success: boolean
      data?: { id?: string }
    }
    const acceptInviteId = acceptInviteJson.data?.id ?? ''

    const acceptByIdRes = await app.http.post(`/api/invitations/${acceptInviteId}/accept-by-id`, {
      headers: await memberHeader(app, acceptedUser.id, acceptedUser.email),
    })
    expect(acceptByIdRes.status).toBe(200)

    const declinedInviteRes = await app.http.post(`/api/organizations/${org.id}/invitations`, {
      headers: await managerHeader(app, manager.id, manager.email),
      body: { email: declinedUser.email },
    })
    const declinedInviteJson = (await declinedInviteRes.json()) as {
      success: boolean
      data?: { id?: string }
    }
    const declinedInviteId = declinedInviteJson.data?.id ?? ''

    const declineRes = await app.http.post(`/api/invitations/${declinedInviteId}/decline`, {
      headers: await memberHeader(app, declinedUser.id, declinedUser.email),
    })
    expect(declineRes.status).toBe(200)

    const declinedRow = await app.db
      .table('organization_invitations')
      .where('id', '=', declinedInviteId)
      .first()
    expect(declinedRow?.status).toBe('cancelled')

    const declinedMemberRow = await app.db
      .table('organization_members')
      .where('organization_id', '=', org.id)
      .where('user_id', '=', declinedUser.id)
      .first()
    expect(declinedMemberRow).toBeNull()
  })
})
