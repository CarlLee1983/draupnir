import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Auth admin status changes', () => {
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

  it('lets an admin suspend and reactivate a user while enforcing login and token access rules', async () => {
    const adminEmail = 'status-admin@example.test'
    const memberEmail = 'status-member@example.test'
    const password = 'SecurePass123'

    const adminRegisterRes = await app.http.post('/api/auth/register', {
      body: { email: adminEmail, password },
    })
    const adminRegisterJson = (await adminRegisterRes.json()) as { data?: { id: string } }
    const adminId = adminRegisterJson.data?.id as string
    await app.db.table('users').where('id', '=', adminId).update({ role: 'admin' })

    const memberRegisterRes = await app.http.post('/api/auth/register', {
      body: { email: memberEmail, password },
    })
    const memberRegisterJson = (await memberRegisterRes.json()) as { data?: { id: string } }
    const memberId = memberRegisterJson.data?.id as string

    const adminHeaders = await app.auth.bearerHeaderFor({
      userId: adminId,
      email: adminEmail,
      role: 'admin',
    })

    const memberLoginRes = await app.http.post('/api/auth/login', {
      body: { email: memberEmail, password },
    })
    const memberLoginJson = (await memberLoginRes.json()) as { data?: { accessToken: string } }
    const memberAccessToken = memberLoginJson.data?.accessToken as string

    const suspendRes = await app.http.patch(`/api/users/${memberId}/status`, {
      headers: adminHeaders,
      body: { status: 'suspended' },
    })
    expect(suspendRes.status).toBe(200)

    const suspendedUser = await app.db.table('users').where('id', '=', memberId).first()
    expect(suspendedUser?.status).toBe('suspended')

    const revokedRows = await app.db
      .table('auth_tokens')
      .where('user_id', '=', memberId)
      .whereNotNull('revoked_at')
      .select()
    expect(revokedRows.length).toBeGreaterThan(0)

    const suspendedLoginRes = await app.http.post('/api/auth/login', {
      body: { email: memberEmail, password },
    })
    expect(suspendedLoginRes.status).toBe(401)
    const suspendedLoginJson = (await suspendedLoginRes.json()) as { error?: string }
    expect(suspendedLoginJson.error).toBe('ACCOUNT_SUSPENDED')

    const revokedSessionRes = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${memberAccessToken}` },
    })
    expect(revokedSessionRes.status).toBe(401)

    const reactivateRes = await app.http.patch(`/api/users/${memberId}/status`, {
      headers: adminHeaders,
      body: { status: 'active' },
    })
    expect(reactivateRes.status).toBe(200)

    const activeUser = await app.db.table('users').where('id', '=', memberId).first()
    expect(activeUser?.status).toBe('active')

    const activeLoginRes = await app.http.post('/api/auth/login', {
      body: { email: memberEmail, password },
    })
    expect(activeLoginRes.status).toBe(200)
  })
})
