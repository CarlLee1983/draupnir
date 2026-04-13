/**
 * Simulates a CLI client making requests to the Device Flow API.
 *
 * Used in E2E tests to represent the CLI side of the Device Flow handshake.
 */
export class CliTestClient {
  private baseUrl: string
  private accessToken?: string
  private refreshToken?: string

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  /**
   * Initiate device flow: POST /cli/device-code
   * @returns { deviceCode, userCode, verificationUri, expiresIn, interval }
   */
  async initiateDeviceFlow(): Promise<{
    deviceCode: string
    userCode: string
    verificationUri: string
    expiresIn: number
    interval: number
  }> {
    const url = `${this.baseUrl}/cli/device-code`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response) {
      throw new Error(`Device code request failed: fetch returned undefined for ${url}`)
    }

    if (!response.ok) {
      throw new Error(`Device code request failed: ${response.status}`)
    }

    const body = (await response.json()) as {
      success?: boolean
      data?: {
        deviceCode: string
        userCode: string
        verificationUri: string
        expiresIn: number
        interval: number
      }
      message?: string
    }
    if (!body.success || !body.data) {
      throw new Error(`Device code generation failed: ${body.message}`)
    }

    return body.data
  }

  /**
   * Poll for token exchange: POST /cli/token with deviceCode
   * Returns PENDING (428) until authorized, then returns tokens
   */
  async pollTokenExchange(deviceCode: string): Promise<{
    accessToken: string
    refreshToken: string
    user: { id: string; email: string; role: string }
  }> {
    const response = await fetch(`${this.baseUrl}/cli/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceCode }),
    })

    if (!response.ok) {
      const body = (await response.json()) as { message?: string }
      if (response.status === 428) {
        throw new Error('AUTHORIZATION_PENDING')
      }
      if (response.status === 410) {
        throw new Error('EXPIRED')
      }
      throw new Error(`Token exchange failed: ${body.message}`)
    }

    const body = (await response.json()) as {
      success?: boolean
      data?: {
        accessToken: string
        refreshToken: string
        user: { id: string; email: string; role: string }
      }
      message?: string
    }
    if (!body.success || !body.data) {
      throw new Error(`Token exchange failed: ${body.message}`)
    }

    this.accessToken = body.data.accessToken
    this.refreshToken = body.data.refreshToken
    return body.data
  }

  /**
   * Proxy an LLM request: POST /cli/proxy with access token
   */
  async proxyLLMRequest(
    model: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<{
    choices: Array<{ role: string; content: string }>
  }> {
    if (!this.accessToken) {
      throw new Error('Not authenticated — no access token')
    }

    const response = await fetch(`${this.baseUrl}/cli/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ model, messages, stream: false }),
    })

    if (!response.ok) {
      throw new Error(`LLM proxy failed: ${response.status}`)
    }

    const body = (await response.json()) as {
      success?: boolean
      message?: string
      data?: { choices: Array<{ role: string; content: string }> }
    }
    if (!body.success) {
      throw new Error(`LLM request failed: ${body.message}`)
    }

    if (!body.data) {
      throw new Error('LLM request failed: missing response data')
    }

    return body.data
  }

  /**
   * Logout single session: POST /cli/logout with access token
   */
  async logout(): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated — no access token')
    }

    const response = await fetch(`${this.baseUrl}/cli/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Logout failed: ${response.status}`)
    }

    this.accessToken = undefined
  }

  /**
   * Logout all sessions: POST /cli/logout-all with access token
   */
  async logoutAll(): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated — no access token')
    }

    const response = await fetch(`${this.baseUrl}/cli/logout-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Logout all failed: ${response.status}`)
    }

    this.accessToken = undefined
  }

  /**
   * Get current access token (for assertions)
   */
  getAccessToken(): string | undefined {
    return this.accessToken
  }

  /**
   * Get current refresh token (for assertions)
   */
  getRefreshToken(): string | undefined {
    return this.refreshToken
  }
}
