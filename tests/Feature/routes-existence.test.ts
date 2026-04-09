import { describe, it, expect, beforeAll } from 'bun:test'
import { TestClient } from './lib/test-client'
import { setupTestServer, getBaseURL } from './lib/test-server'

setupTestServer()

let client: TestClient

beforeAll(() => {
  client = new TestClient(getBaseURL())
})

describe('Routes Existence Verification (不返回 404 就代表存在)', () => {
  describe('Health Module', () => {
    it('GET /health 存在', async () => {
      const response = await client.get('/health')
      expect(response.status).not.toBe(404)
    })

    it('GET /health/history 存在', async () => {
      const response = await client.get('/health/history')
      expect(response.status).not.toBe(404)
    })
  })

  describe('Auth Module', () => {
    it('POST /api/auth/register 存在', async () => {
      const response = await client.post('/api/auth/register', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /api/auth/login 存在', async () => {
      const response = await client.post('/api/auth/login', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /api/auth/refresh 存在', async () => {
      const response = await client.post('/api/auth/refresh', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /api/auth/logout 存在', async () => {
      const response = await client.post('/api/auth/logout', {})
      expect(response.status).not.toBe(404)
    })
  })

  describe('Profile Module', () => {
    it('GET /api/users/me 存在', async () => {
      const response = await client.get('/api/users/me')
      expect(response.status).not.toBe(404)
    })

    it('PUT /api/users/me 存在', async () => {
      const response = await client.put('/api/users/me', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /api/users 存在', async () => {
      const response = await client.get('/api/users')
      expect(response.status).not.toBe(404)
    })

    it('GET /api/users/:id 存在', async () => {
      const response = await client.get('/api/users/test-id')
      expect(response.status).not.toBe(404)
    })

    it('PATCH /api/users/:id/status 存在', async () => {
      const response = await client.patch('/api/users/test-id/status', {})
      expect(response.status).not.toBe(404)
    })
  })

  describe('Organization Module', () => {
    it('POST /api/organizations 存在', async () => {
      const response = await client.post('/api/organizations', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /api/organizations 存在', async () => {
      const response = await client.get('/api/organizations')
      expect(response.status).not.toBe(404)
    })

    it('GET /api/organizations/:id 存在', async () => {
      const response = await client.get('/api/organizations/test-id')
      expect(response.status).not.toBe(404)
    })

    it('PUT /api/organizations/:id 存在', async () => {
      const response = await client.put('/api/organizations/test-id', {})
      expect(response.status).not.toBe(404)
    })

    it('PATCH /api/organizations/:id/status 存在', async () => {
      const response = await client.patch('/api/organizations/test-id/status', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /api/organizations/:id/members 存在', async () => {
      const response = await client.get('/api/organizations/test-id/members')
      expect(response.status).not.toBe(404)
    })

    it('POST /api/organizations/:id/invitations 存在', async () => {
      const response = await client.post('/api/organizations/test-id/invitations', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /api/organizations/:id/invitations 存在', async () => {
      const response = await client.get('/api/organizations/test-id/invitations')
      expect(response.status).not.toBe(404)
    })

    it('DELETE /api/organizations/:id/invitations/:invId 存在', async () => {
      const response = await client.delete('/api/organizations/test-id/invitations/test-inv')
      expect(response.status).not.toBe(404)
    })

    it('POST /api/invitations/:token/accept 存在', async () => {
      const response = await client.post('/api/invitations/test-token/accept', {})
      expect(response.status).not.toBe(404)
    })

    it('DELETE /api/organizations/:id/members/:userId 存在', async () => {
      const response = await client.delete('/api/organizations/test-id/members/test-user')
      expect(response.status).not.toBe(404)
    })

    it('PATCH /api/organizations/:id/members/:userId/role 存在', async () => {
      const response = await client.patch('/api/organizations/test-id/members/test-user/role', {})
      expect(response.status).not.toBe(404)
    })
  })

  describe('ApiKey Module', () => {
    it('POST /api/organizations/:orgId/keys 存在', async () => {
      const response = await client.post('/api/organizations/test-org/keys', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /api/organizations/:orgId/keys 存在', async () => {
      const response = await client.get('/api/organizations/test-org/keys')
      expect(response.status).not.toBe(404)
    })

    it('POST /api/keys/:keyId/revoke 存在', async () => {
      const response = await client.post('/api/keys/test-key/revoke', {})
      expect(response.status).not.toBe(404)
    })

    it('PATCH /api/keys/:keyId/label 存在', async () => {
      const response = await client.patch('/api/keys/test-key/label', {})
      expect(response.status).not.toBe(404)
    })

    it('PUT /api/keys/:keyId/permissions 存在', async () => {
      const response = await client.put('/api/keys/test-key/permissions', {})
      expect(response.status).not.toBe(404)
    })
  })

  describe('Dashboard Module', () => {
    it('GET /api/organizations/:orgId/dashboard 存在', async () => {
      const response = await client.get('/api/organizations/test-org/dashboard')
      expect(response.status).not.toBe(404)
    })

    it('GET /api/organizations/:orgId/dashboard/usage 存在', async () => {
      const response = await client.get('/api/organizations/test-org/dashboard/usage')
      expect(response.status).not.toBe(404)
    })
  })

  describe('Credit Module', () => {
    it('GET /api/organizations/:orgId/credits/balance 存在', async () => {
      const response = await client.get('/api/organizations/test-org/credits/balance')
      expect(response.status).not.toBe(404)
    })

    it('GET /api/organizations/:orgId/credits/transactions 存在', async () => {
      const response = await client.get('/api/organizations/test-org/credits/transactions')
      expect(response.status).not.toBe(404)
    })

    it('POST /api/organizations/:orgId/credits/topup 存在', async () => {
      const response = await client.post('/api/organizations/test-org/credits/topup', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /api/organizations/:orgId/credits/refund 存在', async () => {
      const response = await client.post('/api/organizations/test-org/credits/refund', {})
      expect(response.status).not.toBe(404)
    })
  })

  describe('Contract Module', () => {
    it('POST /api/contracts/handle-expiry 存在', async () => {
      const response = await client.post('/api/contracts/handle-expiry', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /api/contracts 存在', async () => {
      const response = await client.post('/api/contracts', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /api/contracts 存在', async () => {
      const response = await client.get('/api/contracts')
      expect(response.status).not.toBe(404)
    })

    it('GET /api/contracts/:contractId 存在', async () => {
      const response = await client.get('/api/contracts/test-id')
      expect(response.status).not.toBe(404)
    })

    it('PUT /api/contracts/:contractId 存在', async () => {
      const response = await client.put('/api/contracts/test-id', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /api/contracts/:contractId/activate 存在', async () => {
      const response = await client.post('/api/contracts/test-id/activate', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /api/contracts/:contractId/terminate 存在', async () => {
      const response = await client.post('/api/contracts/test-id/terminate', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /api/contracts/:contractId/renew 存在', async () => {
      const response = await client.post('/api/contracts/test-id/renew', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /api/contracts/:contractId/assign 存在', async () => {
      const response = await client.post('/api/contracts/test-id/assign', {})
      expect(response.status).not.toBe(404)
    })
  })

  describe('AppModule Module', () => {
    it('POST /api/modules 存在', async () => {
      const response = await client.post('/api/modules', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /api/modules 存在', async () => {
      const response = await client.get('/api/modules')
      expect(response.status).not.toBe(404)
    })

    it('GET /api/modules/:moduleId 存在', async () => {
      const response = await client.get('/api/modules/test-id')
      expect(response.status).not.toBe(404)
    })

    it('POST /api/organizations/:orgId/modules/subscribe 存在', async () => {
      const response = await client.post('/api/organizations/test-org/modules/subscribe', {})
      expect(response.status).not.toBe(404)
    })

    it('DELETE /api/organizations/:orgId/modules/:moduleId 存在', async () => {
      const response = await client.delete('/api/organizations/test-org/modules/test-id')
      expect(response.status).not.toBe(404)
    })

    it('GET /api/organizations/:orgId/modules 存在', async () => {
      const response = await client.get('/api/organizations/test-org/modules')
      expect(response.status).not.toBe(404)
    })
  })

  describe('AppApiKey Module', () => {
    it('POST /api/organizations/:orgId/app-keys 存在', async () => {
      const response = await client.post('/api/organizations/test-org/app-keys', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /api/organizations/:orgId/app-keys 存在', async () => {
      const response = await client.get('/api/organizations/test-org/app-keys')
      expect(response.status).not.toBe(404)
    })

    it('POST /api/app-keys/:keyId/rotate 存在', async () => {
      const response = await client.post('/api/app-keys/test-key/rotate', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /api/app-keys/:keyId/revoke 存在', async () => {
      const response = await client.post('/api/app-keys/test-key/revoke', {})
      expect(response.status).not.toBe(404)
    })

    it('PUT /api/app-keys/:keyId/scope 存在', async () => {
      const response = await client.put('/api/app-keys/test-key/scope', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /api/app-keys/:keyId/usage 存在', async () => {
      const response = await client.get('/api/app-keys/test-key/usage')
      expect(response.status).not.toBe(404)
    })
  })

  describe('DevPortal Module', () => {
    it('POST /api/dev-portal/apps 存在', async () => {
      const response = await client.post('/api/dev-portal/apps', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /api/dev-portal/apps 存在', async () => {
      const response = await client.get('/api/dev-portal/apps')
      expect(response.status).not.toBe(404)
    })

    it('POST /api/dev-portal/apps/:appId/keys 存在', async () => {
      const response = await client.post('/api/dev-portal/apps/test-app/keys', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /api/dev-portal/apps/:appId/keys 存在', async () => {
      const response = await client.get('/api/dev-portal/apps/test-app/keys')
      expect(response.status).not.toBe(404)
    })

    it('POST /api/dev-portal/apps/:appId/keys/:keyId/revoke 存在', async () => {
      const response = await client.post('/api/dev-portal/apps/test-app/keys/test-key/revoke', {})
      expect(response.status).not.toBe(404)
    })

    it('PUT /api/dev-portal/apps/:appId/webhook 存在', async () => {
      const response = await client.put('/api/dev-portal/apps/test-app/webhook', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /api/dev-portal/docs 存在', async () => {
      const response = await client.get('/api/dev-portal/docs')
      expect(response.status).not.toBe(404)
    })
  })

  describe('SdkApi Module', () => {
    it('POST /sdk/v1/chat/completions 存在', async () => {
      const response = await client.post('/sdk/v1/chat/completions', {})
      expect(response.status).not.toBe(404)
    })

    it('GET /sdk/v1/usage 存在', async () => {
      const response = await client.get('/sdk/v1/usage')
      expect(response.status).not.toBe(404)
    })

    it('GET /sdk/v1/balance 存在', async () => {
      const response = await client.get('/sdk/v1/balance')
      expect(response.status).not.toBe(404)
    })
  })

  describe('CliApi Module', () => {
    it('POST /cli/device-code 存在', async () => {
      const response = await client.post('/cli/device-code', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /cli/token 存在', async () => {
      const response = await client.post('/cli/token', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /cli/authorize 存在', async () => {
      const response = await client.post('/cli/authorize', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /cli/proxy 存在', async () => {
      const response = await client.post('/cli/proxy', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /cli/logout 存在', async () => {
      const response = await client.post('/cli/logout', {})
      expect(response.status).not.toBe(404)
    })

    it('POST /cli/logout-all 存在', async () => {
      const response = await client.post('/cli/logout-all', {})
      expect(response.status).not.toBe(404)
    })
  })

  describe('API Root Route', () => {
    it('GET /api 存在', async () => {
      const response = await client.get('/api')
      expect(response.status).not.toBe(404)
    })
  })
})
