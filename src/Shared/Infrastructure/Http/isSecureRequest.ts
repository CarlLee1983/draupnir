import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * Determines whether the current request arrived over HTTPS.
 *
 * Resolution order:
 * 1. `FORCE_HTTPS=true` environment variable — explicit override for all envs.
 * 2. `X-Forwarded-Proto: https` header — set by reverse proxies / Cloudflare.
 * 3. `NODE_ENV === 'production'` — fallback for simple single-node deployments.
 *
 * Use this instead of bare `process.env.NODE_ENV === 'production'` checks so that
 * staging environments behind HTTPS proxies also get the `Secure` cookie flag.
 */
export function isSecureRequest(ctx: IHttpContext): boolean {
  if (process.env.FORCE_HTTPS === 'true') return true

  const proto = (
    ctx.getHeader('X-Forwarded-Proto') ??
    ctx.getHeader('x-forwarded-proto') ??
    ''
  ).toLowerCase()

  if (proto === 'https') return true

  return process.env.NODE_ENV === 'production'
}
