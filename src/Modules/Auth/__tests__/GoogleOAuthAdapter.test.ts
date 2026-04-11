/**
 * GoogleOAuthAdapter unit tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GoogleOAuthAdapter } from '../Infrastructure/Services/GoogleOAuthAdapter'

describe('GoogleOAuthAdapter', () => {
  let adapter: GoogleOAuthAdapter

  beforeEach(() => {
    adapter = new GoogleOAuthAdapter(
      'test-client-id',
      'test-client-secret',
      'http://localhost:3000/oauth/google/callback',
    )
  })

  it('should exchange authorization code for access token', async () => {
    const mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
        { status: 200 },
      ),
    )

    const token = await adapter.exchangeCodeForToken('test-code')
    expect(token).toBe('test-access-token')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('code=test-code'),
      }),
    )
  })

  it('should throw error on invalid code', async () => {
    const mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'The authorization code is invalid or expired.',
        }),
        { status: 400 },
      ),
    )

    await expect(adapter.exchangeCodeForToken('invalid-code')).rejects.toThrow(
      /authorization code is invalid/,
    )
  })
})
