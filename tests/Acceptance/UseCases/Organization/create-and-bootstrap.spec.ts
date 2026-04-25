import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

function extractAuthToken(setCookie: string | null): string | null {
  if (!setCookie) return null
  const match = setCookie.match(/auth_token=([^;]+)/)
  return match?.[1] ?? null
}

describe('Organization bootstrap', () => {
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

  it('rejects a second organization when the user already has membership', async () => {
    const creator = await app.seed.user({
      id: 'user-2',
      email: 'member-2@example.test',
      role: 'user',
    })
    await app.seed.organization({ id: 'org-existing', name: 'Existing Org', slug: 'existing-org' })
    await app.seed.orgMember({ orgId: 'org-existing', userId: creator.id, role: 'member' })

    const response = await app.http.post('/api/organizations', {
      headers: await app.auth.bearerHeaderFor({
        userId: creator.id,
        email: creator.email,
        role: 'member',
      }),
      body: { name: 'Second Org', slug: 'second-org' },
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as {
      success: boolean
      error?: string
    }
    expect(body.success).toBe(false)
    expect(body.error).toBe('ALREADY_HAS_ORGANIZATION')
  })

  it('creates an organization, promotes the creator to manager, and rotates the auth cookie', async () => {
    const creator = await app.seed.user({
      id: 'user-1',
      email: 'member@example.test',
      role: 'user',
    })

    const response = await app.http.post('/api/organizations', {
      headers: await app.auth.bearerHeaderFor({
        userId: creator.id,
        email: creator.email,
        role: 'member',
      }),
      body: { name: 'Acme', slug: 'acme' },
    })

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      success: boolean
      data?: { id: string; redirectTo?: string }
    }
    expect(body.success).toBe(true)
    expect(body.data?.redirectTo).toBe('/manager/dashboard')

    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toContain('auth_token=')

    const orgRow = await app.db.table('organizations').where('slug', '=', 'acme').first()
    expect(orgRow).toBeTruthy()

    const memberRow = await app.db
      .table('organization_members')
      .where('organization_id', '=', body.data?.id ?? '')
      .where('user_id', '=', creator.id)
      .first()
    expect(memberRow?.role).toBe('manager')

    const userRow = await app.db.table('users').where('id', '=', creator.id).first()
    expect(userRow?.role).toBe('manager')

    const rotatedToken = extractAuthToken(setCookie)
    expect(rotatedToken).toBeTruthy()

    const followUp = await app.http.get(`/api/organizations/${body.data?.id ?? ''}`, {
      headers: { Cookie: `auth_token=${rotatedToken}` },
    })
    expect(followUp.status).toBe(200)
  })
})
