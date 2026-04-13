/**
 * Port interface for Google OAuth operations.
 * Defined in Application layer; implemented by GoogleOAuthAdapter in Infrastructure.
 */
export interface IGoogleOAuthAdapter {
  exchangeCodeForToken(code: string): Promise<string>
  getUserInfo(accessToken: string): Promise<{
    id: string
    email: string
    name?: string
    picture?: string
  }>
}
