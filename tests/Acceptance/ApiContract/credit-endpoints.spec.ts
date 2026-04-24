import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../support/TestApp'

async function provisionCreditAccess(app: TestApp, orgId: string, createdByUserId: string): Promise<void> {
  const modules = await app.seed.allCoreAppModules()
  const creditModule = modules.find((module) => module.name === 'credit')
  if (!creditModule) {
    throw new Error('credit module not found')
  }

  await app.seed.contract({
    targetId: orgId,
    createdBy: createdByUserId,
    allowedModules: ['credit'],
  })
  await app.seed.moduleSubscription({ orgId, moduleId: creditModule.id })
}

describe('API Contract: /api/organizations/:orgId/credits/*', () => {
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

  describe('POST /api/organizations/:orgId/credits/topup', () => {
    it('admin → 200 + balance 更新', async () => {
      await app.seed.user({ id: 'admin-1', email: 'a@e.com', role: 'admin' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '0' })

      const res = await app.http.post('/api/organizations/org-1/credits/topup', {
        body: { amount: '500' },
        headers: app.auth.bearerHeaderFor({
          userId: 'admin-1',
          email: 'a@e.com',
          role: 'admin',
        }),
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as { success: boolean; data?: { balance: string } }
      expect(json.success).toBe(true)
      expect(json.data?.balance).toBe('500')

      const acc = await app.db.table('credit_accounts').where('org_id', '=', 'org-1').first()
      expect((acc as { balance: string }).balance).toBe('500')
    })

    it('非 admin(user role)→ 403 FORBIDDEN', async () => {
      await app.seed.user({ id: 'u-1', email: 'u@e.com', role: 'user' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '0' })
      await provisionCreditAccess(app, 'org-1', 'u-1')

      const res = await app.http.post('/api/organizations/org-1/credits/topup', {
        body: { amount: '500' },
        headers: app.auth.bearerHeaderFor({ userId: 'u-1', email: 'u@e.com', role: 'user' }),
      })

      expect(res.status).toBe(403)
      const json = (await res.json()) as { error?: string }
      expect(json.error).toBe('FORBIDDEN')
    })

    it('缺欄位(無 amount)→ 422 含 Zod 訊息', async () => {
      await app.seed.user({ id: 'admin-1', email: 'a@e.com', role: 'admin' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '0' })

      const res = await app.http.post('/api/organizations/org-1/credits/topup', {
        body: {},
        headers: app.auth.bearerHeaderFor({
          userId: 'admin-1',
          email: 'a@e.com',
          role: 'admin',
        }),
      })

      expect(res.status).toBe(422)
    })
  })

  describe('GET /api/organizations/:orgId/credits/balance', () => {
    it('組織成員 → 200 + 正確 balance', async () => {
      await app.seed.user({ id: 'u-1', email: 'u@e.com', role: 'user' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.orgMember({ orgId: 'org-1', userId: 'u-1', role: 'member' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '777' })
      await provisionCreditAccess(app, 'org-1', 'u-1')

      const res = await app.http.get('/api/organizations/org-1/credits/balance', {
        headers: app.auth.bearerHeaderFor({ userId: 'u-1', email: 'u@e.com', role: 'user' }),
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as { success: boolean; data?: { balance: string } }
      expect(json.success).toBe(true)
      expect(json.data?.balance).toBe('777')
    })

    it('未認證 → 401 UNAUTHORIZED', async () => {
      const res = await app.http.get('/api/organizations/org-1/credits/balance')
      expect(res.status).toBe(401)
      const json = (await res.json()) as { error?: string }
      expect(json.error).toBe('UNAUTHORIZED')
    })

    it('非組織成員 → 200 + success:false + NOT_ORG_MEMBER', async () => {
      await app.seed.user({ id: 'u-2', email: 'x@e.com', role: 'user' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '500' })
      await provisionCreditAccess(app, 'org-1', 'u-2')

      const res = await app.http.get('/api/organizations/org-1/credits/balance', {
        headers: app.auth.bearerHeaderFor({ userId: 'u-2', email: 'x@e.com', role: 'user' }),
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as { success: boolean; error?: string }
      expect(json.success).toBe(false)
      expect(json.error).toBe('NOT_ORG_MEMBER')
    })
  })

  describe('GET /api/organizations/:orgId/credits/transactions', () => {
    it('組織成員 → 200 + 分頁', async () => {
      await app.seed.user({ id: 'u-1', email: 'u@e.com', role: 'user' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.orgMember({ orgId: 'org-1', userId: 'u-1', role: 'member' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '500' })
      await provisionCreditAccess(app, 'org-1', 'u-1')

      const res = await app.http.get('/api/organizations/org-1/credits/transactions', {
        headers: app.auth.bearerHeaderFor({ userId: 'u-1', email: 'u@e.com', role: 'user' }),
        query: { page: 1, limit: 10 },
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as {
        success: boolean
        data?: { transactions: unknown[]; total: number; page: number; limit: number }
      }
      expect(json.success).toBe(true)
      expect(json.data?.page).toBe(1)
      expect(json.data?.limit).toBe(10)
      expect(Array.isArray(json.data?.transactions)).toBe(true)
    })

    it('未認證 → 401', async () => {
      const res = await app.http.get('/api/organizations/org-1/credits/transactions')
      expect(res.status).toBe(401)
    })

    it('非組織成員 → 200 + NOT_ORG_MEMBER', async () => {
      await app.seed.user({ id: 'u-2', email: 'x@e.com', role: 'user' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '500' })
      await provisionCreditAccess(app, 'org-1', 'u-2')

      const res = await app.http.get('/api/organizations/org-1/credits/transactions', {
        headers: app.auth.bearerHeaderFor({ userId: 'u-2', email: 'x@e.com', role: 'user' }),
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as { error?: string }
      expect(json.error).toBe('NOT_ORG_MEMBER')
    })
  })
})
