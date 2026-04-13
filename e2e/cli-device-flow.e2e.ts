import { expect, test } from '@playwright/test'

/**
 * End-to-end exercise of the CLI device flow over HTTP.
 * Routes are registered without the /api prefix (see registerCliApiRoutes).
 */
test.describe('CLI device flow', { tag: '@smoke' }, () => {
  test('initiate → authorize (authenticated) → token exchange', async ({ request }) => {
    const email = `cli-device-${Date.now()}@test.com`
    const password = 'Test1234!'

    const reg = await request.post('/api/auth/register', {
      data: { email, password },
    })
    expect(reg.ok()).toBeTruthy()

    const loginRes = await request.post('/api/auth/login', {
      data: { email, password },
    })
    expect(loginRes.ok()).toBeTruthy()
    const loginJson = (await loginRes.json()) as { data?: { accessToken: string } }
    const accessToken = loginJson.data?.accessToken
    expect(accessToken).toBeTruthy()

    const initiateRes = await request.post('/cli/device-code')
    expect(initiateRes.status()).toBe(200)
    const initiateJson = (await initiateRes.json()) as {
      success: boolean
      data?: { deviceCode: string; userCode: string }
    }
    expect(initiateJson.success).toBe(true)
    const flowData = initiateJson.data
    expect(flowData?.deviceCode).toBeTruthy()
    expect(flowData?.userCode).toBeTruthy()
    if (!flowData?.deviceCode || !flowData.userCode) {
      throw new Error('device flow response missing codes')
    }
    const { deviceCode, userCode } = flowData

    const authRes = await request.post('/cli/authorize', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { userCode },
    })
    expect(authRes.status()).toBe(200)

    const tokenRes = await request.post('/cli/token', {
      data: { deviceCode },
    })
    expect(tokenRes.status()).toBe(200)
    const tokenJson = (await tokenRes.json()) as {
      data?: { accessToken: string; refreshToken: string }
    }
    expect(tokenJson.data?.accessToken).toBeTruthy()
    expect(tokenJson.data?.refreshToken).toBeTruthy()
  })

  test('token endpoint returns 428 while authorization is still pending', async ({ request }) => {
    const initiateRes = await request.post('/cli/device-code')
    expect(initiateRes.ok()).toBeTruthy()
    const initiateJson = (await initiateRes.json()) as { data?: { deviceCode: string } }
    const pendingData = initiateJson.data
    expect(pendingData?.deviceCode).toBeTruthy()
    if (!pendingData?.deviceCode) {
      throw new Error('device flow response missing deviceCode')
    }
    const { deviceCode } = pendingData

    const tokenRes = await request.post('/cli/token', {
      data: { deviceCode },
    })
    expect(tokenRes.status()).toBe(428)
  })
})
