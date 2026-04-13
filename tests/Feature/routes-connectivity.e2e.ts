import { beforeAll, describe, expect, it } from 'bun:test'
import { TestClient } from './lib/test-client'
import { getBaseURL, setupTestServerFor } from './lib/test-server'

setupTestServerFor('routes-connectivity')

let client: TestClient

beforeAll(() => {
  client = new TestClient(getBaseURL())
})

describe('Routes Connectivity Verification', () => {
  describe('Health Module Routes', () => {
    it('GET /health 應該返回健康狀態', async () => {
      const response = await client.get('/health')
      expect(response.status).toBe(200)
      expect(response.json).toHaveProperty('success')
    })

    it('GET /health/history 應該返回健康檢查歷史', async () => {
      const response = await client.get('/health/history')
      expect(response.status).toBe(200)
      expect(response.json).toHaveProperty('success')
    })
  })

  describe('Auth Module Routes', () => {
    it('POST /api/auth/register 應該接受請求', async () => {
      const response = await client.post('/api/auth/register', {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      })
      // 可能成功或驗證失敗，但路由應該存在
      expect([200, 400, 409]).toContain(response.status)
    })

    it('POST /api/auth/login 應該接受請求', async () => {
      const response = await client.post('/api/auth/login', {
        email: 'test@example.com',
        password: 'password',
      })
      expect([200, 400, 401]).toContain(response.status)
    })

    it('POST /api/auth/refresh 應該接受請求', async () => {
      const response = await client.post('/api/auth/refresh', {
        refreshToken: 'test-token',
      })
      expect([200, 400, 401]).toContain(response.status)
    })

    it('POST /api/auth/logout 應該接受認證請求', async () => {
      const response = await client.post(
        '/api/auth/logout',
        {},
        {
          headers: { Authorization: 'Bearer test-token' },
        },
      )
      expect([200, 400, 401]).toContain(response.status)
    })
  })

  describe('Profile Module Routes', () => {
    it('GET /api/users/me 應該需要認證', async () => {
      const response = await client.get('/api/users/me')
      expect(response.status).toBe(401)
    })

    it('GET /api/users 應該需要管理員權限', async () => {
      const response = await client.get('/api/users')
      expect([401, 403]).toContain(response.status)
    })

    it('GET /api/users/:id 應該需要管理員權限', async () => {
      const response = await client.get('/api/users/test-id')
      expect([401, 403]).toContain(response.status)
    })

    it('PUT /api/users/me 應該需要認證', async () => {
      const response = await client.put('/api/users/me', { name: 'New Name' })
      expect(response.status).toBe(401)
    })

    it('PATCH /api/users/:id/status 應該需要管理員權限', async () => {
      const response = await client.patch('/api/users/test-id/status', { status: 'active' })
      expect([401, 403]).toContain(response.status)
    })
  })

  describe('Organization Module Routes', () => {
    it('POST /api/organizations 應該需要管理員權限', async () => {
      const response = await client.post('/api/organizations', { name: 'Test Org' })
      expect([401, 403]).toContain(response.status)
    })

    it('GET /api/organizations 應該需要管理員權限', async () => {
      const response = await client.get('/api/organizations')
      expect([401, 403]).toContain(response.status)
    })

    it('GET /api/organizations/:id 應該需要組織上下文', async () => {
      const response = await client.get('/api/organizations/test-id')
      expect([401, 403, 404]).toContain(response.status)
    })

    it('GET /api/organizations/:id/members 應該需要組織上下文', async () => {
      const response = await client.get('/api/organizations/test-id/members')
      expect([401, 403, 404]).toContain(response.status)
    })

    it('POST /api/organizations/:id/invitations 應該需要組織上下文', async () => {
      const response = await client.post('/api/organizations/test-id/invitations', {
        email: 'user@example.com',
        role: 'member',
      })
      expect([401, 403, 404]).toContain(response.status)
    })

    it('POST /api/invitations/:token/accept 應該需要認證', async () => {
      const response = await client.post('/api/invitations/test-token/accept', {})
      expect([401, 403, 400]).toContain(response.status)
    })
  })

  describe('ApiKey Module Routes', () => {
    it('POST /api/organizations/:orgId/keys 應該需要認證', async () => {
      const response = await client.post('/api/organizations/test-org/keys', { label: 'test' })
      expect([401, 403]).toContain(response.status)
    })

    it('GET /api/organizations/:orgId/keys 應該需要認證', async () => {
      const response = await client.get('/api/organizations/test-org/keys')
      expect([401, 403]).toContain(response.status)
    })

    it('POST /api/keys/:keyId/revoke 應該需要認證', async () => {
      const response = await client.post('/api/keys/test-key/revoke', {})
      expect([401, 403]).toContain(response.status)
    })

    it('PATCH /api/keys/:keyId/label 應該需要認證', async () => {
      const response = await client.patch('/api/keys/test-key/label', { label: 'new-label' })
      expect([401, 403]).toContain(response.status)
    })

    it('PUT /api/keys/:keyId/permissions 應該需要認證', async () => {
      const response = await client.put('/api/keys/test-key/permissions', { permissions: [] })
      expect([401, 403]).toContain(response.status)
    })
  })

  describe('Dashboard Module Routes', () => {
    it('GET /api/organizations/:orgId/dashboard 應該需要認證', async () => {
      const response = await client.get('/api/organizations/test-org/dashboard')
      expect([401, 403]).toContain(response.status)
    })

    it('GET /api/organizations/:orgId/dashboard/usage 應該需要認證', async () => {
      const response = await client.get('/api/organizations/test-org/dashboard/usage')
      expect([401, 403]).toContain(response.status)
    })
  })

  describe('Credit Module Routes', () => {
    it('GET /api/organizations/:orgId/credits/balance 應該需要認證', async () => {
      const response = await client.get('/api/organizations/test-org/credits/balance')
      expect([401, 403]).toContain(response.status)
    })

    it('GET /api/organizations/:orgId/credits/transactions 應該需要認證', async () => {
      const response = await client.get('/api/organizations/test-org/credits/transactions')
      expect([401, 403]).toContain(response.status)
    })

    it('POST /api/organizations/:orgId/credits/topup 應該需要管理員權限', async () => {
      const response = await client.post('/api/organizations/test-org/credits/topup', {
        amount: 100,
      })
      expect([401, 403]).toContain(response.status)
    })

    it('POST /api/organizations/:orgId/credits/refund 應該需要管理員權限', async () => {
      const response = await client.post('/api/organizations/test-org/credits/refund', {
        amount: 100,
      })
      expect([401, 403]).toContain(response.status)
    })
  })

  describe('Contract Module Routes', () => {
    it('POST /api/contracts 應該需要管理員權限', async () => {
      const response = await client.post('/api/contracts', {})
      expect([401, 403]).toContain(response.status)
    })

    it('GET /api/contracts 應該需要管理員權限', async () => {
      const response = await client.get('/api/contracts')
      expect([401, 403]).toContain(response.status)
    })

    it('GET /api/contracts/:contractId 應該需要管理員權限', async () => {
      const response = await client.get('/api/contracts/test-id')
      expect([401, 403]).toContain(response.status)
    })

    it('POST /api/contracts/:contractId/activate 應該需要管理員權限', async () => {
      const response = await client.post('/api/contracts/test-id/activate', {})
      expect([401, 403]).toContain(response.status)
    })
  })

  describe('AppModule Routes', () => {
    it('GET /api/modules 應該是公開的', async () => {
      const response = await client.get('/api/modules')
      expect([200, 404]).toContain(response.status)
    })

    it('POST /api/modules 應該需要管理員權限', async () => {
      const response = await client.post('/api/modules', {})
      expect([401, 403]).toContain(response.status)
    })

    it('GET /api/modules/:moduleId 應該是公開的', async () => {
      const response = await client.get('/api/modules/test-id')
      expect([200, 404]).toContain(response.status)
    })

    it('GET /api/organizations/:orgId/modules 應該是公開的', async () => {
      const response = await client.get('/api/organizations/test-org/modules')
      expect([200, 404]).toContain(response.status)
    })
  })

  describe('AppApiKey Module Routes', () => {
    it('POST /api/organizations/:orgId/app-keys 應該需要認證', async () => {
      const response = await client.post('/api/organizations/test-org/app-keys', {})
      expect([401, 403]).toContain(response.status)
    })

    it('GET /api/organizations/:orgId/app-keys 應該需要認證', async () => {
      const response = await client.get('/api/organizations/test-org/app-keys')
      expect([401, 403]).toContain(response.status)
    })

    it('POST /api/app-keys/:keyId/rotate 應該需要認證', async () => {
      const response = await client.post('/api/app-keys/test-key/rotate', {})
      expect([401, 403]).toContain(response.status)
    })

    it('GET /api/app-keys/:keyId/usage 應該需要認證', async () => {
      const response = await client.get('/api/app-keys/test-key/usage')
      expect([401, 403]).toContain(response.status)
    })
  })

  describe('DevPortal Module Routes', () => {
    it('GET /api/dev-portal/docs 應該是公開的', async () => {
      const response = await client.get('/api/dev-portal/docs')
      expect([200, 404]).toContain(response.status)
    })

    it('POST /api/dev-portal/apps 應該需要認證', async () => {
      const response = await client.post('/api/dev-portal/apps', {})
      expect([401, 403]).toContain(response.status)
    })

    it('GET /api/dev-portal/apps 應該需要認證', async () => {
      const response = await client.get('/api/dev-portal/apps')
      expect([401, 403]).toContain(response.status)
    })
  })

  describe('SdkApi Module Routes', () => {
    it('POST /sdk/v1/chat/completions 應該存在', async () => {
      const response = await client.post('/sdk/v1/chat/completions', {})
      // 需要 app auth middleware，可能 401 或 400
      expect([400, 401, 422]).toContain(response.status)
    })

    it('GET /sdk/v1/usage 應該存在', async () => {
      const response = await client.get('/sdk/v1/usage')
      expect([400, 401, 422]).toContain(response.status)
    })

    it('GET /sdk/v1/balance 應該存在', async () => {
      const response = await client.get('/sdk/v1/balance')
      expect([400, 401, 422]).toContain(response.status)
    })
  })

  describe('CliApi Module Routes', () => {
    it('POST /cli/device-code 應該是公開的', async () => {
      const response = await client.post('/cli/device-code', {})
      expect([200, 400]).toContain(response.status)
    })

    it('POST /cli/token 應該是公開的', async () => {
      const response = await client.post('/cli/token', {})
      expect([200, 400]).toContain(response.status)
    })

    it('POST /cli/authorize 應該需要認證', async () => {
      const response = await client.post('/cli/authorize', {})
      expect([401, 403]).toContain(response.status)
    })

    it('POST /cli/proxy 應該需要認證', async () => {
      const response = await client.post('/cli/proxy', {})
      expect([401, 403]).toContain(response.status)
    })

    it('POST /cli/logout 應該需要認證', async () => {
      const response = await client.post('/cli/logout', {})
      expect([401, 403]).toContain(response.status)
    })
  })

  describe('API Root Route', () => {
    it('GET /api 應該返回 API 信息', async () => {
      const response = await client.get('/api')
      expect(response.status).toBe(200)
      expect(response.json).toHaveProperty('success', true)
      expect(response.json).toHaveProperty('message', 'Draupnir API')
    })
  })
})
