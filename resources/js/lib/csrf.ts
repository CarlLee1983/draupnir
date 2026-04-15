/**
 * CSRF for same-origin fetches from the Inertia SPA.
 * Web middleware issues {@link WEB_CSRF_COOKIE_NAME} and mirrors the value into Inertia shared `csrfToken`.
 */

const WEB_CSRF_COOKIE_NAME = 'XSRF-TOKEN'

/**
 * Reads the readable CSRF cookie (double-submit token).
 * Populated after any request through the web/member middleware chain.
 */
export function getXsrfCookieToken(): string {
  const prefix = `${WEB_CSRF_COOKIE_NAME}=`
  const parts = document.cookie.split('; ')
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      const raw = part.slice(prefix.length)
      try {
        return decodeURIComponent(raw)
      } catch {
        return raw
      }
    }
  }
  return ''
}

/**
 * Resolves CSRF for fetch headers: prefer Inertia shared prop, then cookie.
 */
export function resolveCsrfTokenForFetch(inertiaCsrf: string | undefined): string {
  if (typeof inertiaCsrf === 'string' && inertiaCsrf.length > 0) {
    return inertiaCsrf
  }
  return getXsrfCookieToken()
}
