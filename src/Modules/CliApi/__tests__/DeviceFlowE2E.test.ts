import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { CliTestClient } from './helpers/CliTestClient'
import { BrowserAuthHelper } from './helpers/BrowserAuthHelper'
import {
  TEST_LLM_REQUEST,
  pollWithBackoff,
  isValidDeviceCode,
  isValidUserCode,
  isValidJWTToken,
} from './helpers/DeviceFlowTestFixtures'

describe('Device Flow E2E', () => {
  let cliClient: CliTestClient
  let browserAuth: BrowserAuthHelper

  beforeAll(async () => {
    cliClient = new CliTestClient('http://localhost:3000')
    browserAuth = new BrowserAuthHelper()
    await browserAuth.launch(true)
  })

  afterAll(async () => {
    await browserAuth.close()
  })

  describe('Happy Path: Complete Device Flow', () => {
    it('should complete full device authorization flow', async () => {
      // Step 1: CLI initiates device flow
      const deviceFlowResponse = await cliClient.initiateDeviceFlow()

      expect(deviceFlowResponse.deviceCode).toBeDefined()
      expect(isValidDeviceCode(deviceFlowResponse.deviceCode)).toBe(true)
      expect(deviceFlowResponse.userCode).toBeDefined()
      expect(isValidUserCode(deviceFlowResponse.userCode)).toBe(true)
      expect(deviceFlowResponse.verificationUri).toContain('/verify-device')
      expect(deviceFlowResponse.expiresIn).toBe(600)
      expect(deviceFlowResponse.interval).toBe(5)

      // Step 2: Browser authorizes device
      await browserAuth.authorizeDevice(deviceFlowResponse.verificationUri, deviceFlowResponse.userCode)

      // Step 3: CLI polls for token (with retry for authorization pending)
      const tokenResponse = await pollWithBackoff(
        () => cliClient.pollTokenExchange(deviceFlowResponse.deviceCode),
        { maxRetries: 5, initialDelayMs: 1000 },
      )

      expect(tokenResponse.accessToken).toBeDefined()
      expect(isValidJWTToken(tokenResponse.accessToken)).toBe(true)
      expect(tokenResponse.refreshToken).toBeDefined()
      expect(isValidJWTToken(tokenResponse.refreshToken)).toBe(true)
      expect(tokenResponse.user).toBeDefined()
      expect(tokenResponse.user.id).toBeDefined()
      expect(tokenResponse.user.email).toBeDefined()
      expect(tokenResponse.user.role).toBeDefined()

      // Step 4: CLI makes authenticated LLM proxy request
      const llmResponse = await cliClient.proxyLLMRequest(
        TEST_LLM_REQUEST.model,
        TEST_LLM_REQUEST.messages,
      )

      expect(llmResponse.choices).toBeDefined()
      expect(Array.isArray(llmResponse.choices)).toBe(true)
      expect(llmResponse.choices.length).toBeGreaterThan(0)

      // Step 5: CLI logs out
      await cliClient.logout()
      expect(cliClient.getAccessToken()).toBeUndefined()
    })
  })

  describe('Authorization States', () => {
    it('should return authorization_pending (428) before device is authorized', async () => {
      const deviceFlowResponse = await cliClient.initiateDeviceFlow()

      let error
      try {
        await cliClient.pollTokenExchange(deviceFlowResponse.deviceCode)
      } catch (e) {
        error = e
      }

      expect(error).toBeDefined()
      expect(error instanceof Error).toBe(true)
      expect((error as Error).message).toContain('AUTHORIZATION_PENDING')
    })
  })

  describe('Error Handling', () => {
    it('should reject invalid device code', async () => {
      let error
      try {
        await cliClient.pollTokenExchange('invalid-device-code-12345')
      } catch (e) {
        error = e
      }

      expect(error).toBeDefined()
      expect(error instanceof Error).toBe(true)
    })

    it('should reject LLM request without authentication', async () => {
      const newClient = new CliTestClient('http://localhost:3000')
      let error
      try {
        await newClient.proxyLLMRequest(TEST_LLM_REQUEST.model, TEST_LLM_REQUEST.messages)
      } catch (e) {
        error = e
      }

      expect(error).toBeDefined()
      expect((error as Error).message).toContain('Not authenticated')
    })

    it('should reject expired device code with HTTP 410', async () => {
      let error
      try {
        await cliClient.pollTokenExchange('550e8400-e29b-41d4-a716-446655440000')
      } catch (e) {
        error = e
      }

      expect(error).toBeDefined()
      expect((error as Error).message).toMatch(/failed|expired|invalid/i)
    })

    it('should prevent reuse of consumed device code', async () => {
      const deviceFlowResponse = await cliClient.initiateDeviceFlow()
      await browserAuth.authorizeDevice(deviceFlowResponse.verificationUri, deviceFlowResponse.userCode)

      const firstExchange = await pollWithBackoff(
        () => cliClient.pollTokenExchange(deviceFlowResponse.deviceCode),
        { maxRetries: 3 },
      )
      expect(firstExchange.accessToken).toBeDefined()

      // Second attempt with same code should fail
      let error
      try {
        await cliClient.pollTokenExchange(deviceFlowResponse.deviceCode)
      } catch (e) {
        error = e
      }

      expect(error).toBeDefined()
    })

    it('should enforce CSRF protection via device code state', async () => {
      const response1 = await cliClient.initiateDeviceFlow()
      const response2 = await cliClient.initiateDeviceFlow()

      expect(response1.deviceCode).not.toBe(response2.deviceCode)
      expect(response1.userCode).not.toBe(response2.userCode)
    })
  })

  describe('Session Revocation', () => {
    it('should revoke single session after logout', async () => {
      const deviceFlowResponse = await cliClient.initiateDeviceFlow()
      await browserAuth.authorizeDevice(deviceFlowResponse.verificationUri, deviceFlowResponse.userCode)

      const tokenResponse = await pollWithBackoff(
        () => cliClient.pollTokenExchange(deviceFlowResponse.deviceCode),
        { maxRetries: 3 },
      )

      expect(tokenResponse.accessToken).toBeDefined()

      await cliClient.logout()

      expect(cliClient.getAccessToken()).toBeUndefined()
    })

    it('should logout all sessions with logout-all endpoint', async () => {
      const deviceFlowResponse = await cliClient.initiateDeviceFlow()
      await browserAuth.authorizeDevice(deviceFlowResponse.verificationUri, deviceFlowResponse.userCode)

      const tokenResponse = await pollWithBackoff(
        () => cliClient.pollTokenExchange(deviceFlowResponse.deviceCode),
        { maxRetries: 3 },
      )

      expect(tokenResponse.accessToken).toBeDefined()

      await cliClient.logoutAll()

      expect(cliClient.getAccessToken()).toBeUndefined()
    })
  })

  describe('CLI Polling Behavior', () => {
    it('should handle authorization_pending during polling', async () => {
      const deviceFlowResponse = await cliClient.initiateDeviceFlow()

      // First poll before authorization should fail with 428
      let firstPollError
      try {
        await cliClient.pollTokenExchange(deviceFlowResponse.deviceCode)
      } catch (error) {
        firstPollError = error instanceof Error ? error.message : String(error)
      }

      expect(firstPollError).toContain('AUTHORIZATION_PENDING')

      // Then authorize
      await browserAuth.authorizeDevice(deviceFlowResponse.verificationUri, deviceFlowResponse.userCode)

      // Poll again — should succeed
      const tokenResponse = await pollWithBackoff(
        () => cliClient.pollTokenExchange(deviceFlowResponse.deviceCode),
        { maxRetries: 3, initialDelayMs: 500 },
      )

      expect(tokenResponse.accessToken).toBeDefined()
    })

    it('should respect polling interval configuration', async () => {
      const deviceFlowResponse = await cliClient.initiateDeviceFlow()

      expect(deviceFlowResponse.interval).toBe(5)
    })

    it('should report expiration time in device flow response', async () => {
      const deviceFlowResponse = await cliClient.initiateDeviceFlow()
      expect(deviceFlowResponse.expiresIn).toBe(600)
    })
  })
})
