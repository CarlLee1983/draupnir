import { describe, expect, test } from 'bun:test'
import { applyPendingCookies, buildCookieString } from '../cookieUtils'

describe('buildCookieString', () => {
  test('builds minimal cookie', () => {
    const result = buildCookieString('token', 'abc', {})
    expect(result).toBe('token=abc; Path=/')
  })

  test('builds full cookie with all options', () => {
    const result = buildCookieString('auth_token', 'xyz', {
      httpOnly: true,
      sameSite: 'Lax',
      maxAge: 3600,
      path: '/',
    })
    expect(result).toContain('auth_token=xyz')
    expect(result).toContain('HttpOnly')
    expect(result).toContain('SameSite=Lax')
    expect(result).toContain('Max-Age=3600')
    expect(result).toContain('Path=/')
  })
})

describe('applyPendingCookies', () => {
  test('returns original response when no cookies', () => {
    const res = new Response('body', { status: 200 })
    const result = applyPendingCookies(res, [])
    expect(result).toBe(res)
  })

  test('adds Set-Cookie header to response', () => {
    const res = new Response(null, { status: 302, headers: { Location: '/dashboard' } })
    const result = applyPendingCookies(res, [
      { name: 'auth_token', value: 'tok123', options: { httpOnly: true, maxAge: 3600 } },
    ])
    expect(result.headers.get('Set-Cookie')).toContain('auth_token=tok123')
    expect(result.headers.get('Set-Cookie')).toContain('HttpOnly')
    expect(result.headers.get('Location')).toBe('/dashboard')
  })

  test('preserves response status', () => {
    const res = new Response(null, { status: 302, headers: { Location: '/x' } })
    const result = applyPendingCookies(res, [{ name: 'a', value: 'b', options: {} }])
    expect(result.status).toBe(302)
  })
})
