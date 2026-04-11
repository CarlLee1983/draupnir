/**
 * Google OAuth adapter: exchanges authorization codes for access tokens,
 * and fetches user info from Google's API.
 */

export class GoogleOAuthAdapter {
  private readonly tokenEndpoint = 'https://oauth2.googleapis.com/token'
  private readonly userinfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo'

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  async exchangeCodeForToken(code: string): Promise<string> {
    const params = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    })

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data = (await response.json()) as {
      access_token?: string
      error?: string
      error_description?: string
    }

    if (!response.ok || data.error) {
      throw new Error(
        `Google OAuth error: ${data.error_description || data.error || 'Unknown error'}`,
      )
    }

    if (!data.access_token) {
      throw new Error('No access token in Google OAuth response')
    }

    return data.access_token
  }

  async getUserInfo(accessToken: string): Promise<{
    id: string
    email: string
    name?: string
    picture?: string
  }> {
    const response = await fetch(this.userinfoEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch user info from Google: ${response.statusText}`)
    }

    const data = (await response.json()) as {
      id?: string
      email?: string
      name?: string
      picture?: string
    }

    if (!data.id || !data.email) {
      throw new Error('Invalid user info response from Google')
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    }
  }
}
