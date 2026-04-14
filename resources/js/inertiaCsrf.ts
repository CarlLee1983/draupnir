import { router } from '@inertiajs/react'

/** Must match `WEB_CSRF_COOKIE_NAME` in `src/Pages/routing/webCsrfMiddleware.ts`. */
const CSRF_COOKIE_NAME = 'XSRF-TOKEN'

/**
 * Reads a non-HttpOnly cookie set by the server (see `webCsrfMiddleware`).
 */
function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  if (!m?.[1]) return undefined
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}

/**
 * Attach CSRF headers on mutating Inertia visits (double-submit cookie pattern).
 */
export function attachInertiaCsrfHeaders(): void {
  router.on('before', (event) => {
    const visit = event.detail.visit
    if (visit.method === 'get') return
    const token = readCookie(CSRF_COOKIE_NAME)
    if (!token) return
    visit.headers['X-XSRF-TOKEN'] = token
    visit.headers['X-CSRF-Token'] = token
  })
}
