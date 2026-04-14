/**
 * GoogleOAuthAdapter
 *
 * Infrastructure outbound HTTP adapter: concrete `IGoogleOAuthAdapter` using Google's OAuth 2.0
 * token and userinfo endpoints (`fetch`, no extra SDK).
 *
 * Implementation notes:
 * - `clientId`, `clientSecret`, and `redirectUri` must match the Google Cloud OAuth client;
 *   `redirectUri` must exactly match an authorized redirect URI or the token exchange fails.
 * - Failures from Google (HTTP or `error` in JSON) are thrown as `Error` with a short message;
 *   callers should map to application-layer errors if needed.
 */

export class GoogleOAuthAdapter {
  private readonly tokenEndpoint = 'https://oauth2.googleapis.com/token'
  private readonly userinfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo'

  /**
   * @param clientId - Google OAuth 2.0 client ID.
   * @param clientSecret - Client secret (server-side only; never expose to browsers).
   * @param redirectUri - Callback URL registered for this client; must match the value used in
   *   the authorization request.
   */
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  /**
   * Exchanges an authorization `code` from the browser redirect for a short-lived access token.
   *
   * @param code - One-time authorization code from Google's redirect query string.
   * @returns Bearer access token suitable for {@link GoogleOAuthAdapter.getUserInfo}.
   * @throws {Error} If the token endpoint is not OK, returns OAuth `error` JSON, or omits
   *   `access_token`.
   */
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

  /**
   * Loads the authenticated Google account profile (minimal fields used for sign-in / linking).
   *
   * @param accessToken - OAuth access token from {@link GoogleOAuthAdapter.exchangeCodeForToken}.
   * @returns Stable Google `id`, verified `email`, and optional display `name` / `picture` URL.
   * @throws {Error} If the userinfo request is not OK or the JSON lacks `id` or `email`.
   */
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
