import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

const PAYLOAD_TOO_LARGE_BODY = JSON.stringify({
  success: false,
  message: 'Request too large',
  error: 'PAYLOAD_TOO_LARGE',
})

function tooLargeResponse(): Response {
  return new Response(PAYLOAD_TOO_LARGE_BODY, {
    status: 413,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Middleware that rejects requests exceeding `maxBytes`.
 *
 * Two-pass protection:
 * 1. If `Content-Length` header is present: check immediately (no body read).
 * 2. If absent (chunked transfer): read body and measure byte length via TextEncoder.
 *
 * @param maxBytes - Maximum allowed request body size in bytes.
 */
export function createBodySizeLimitMiddleware(maxBytes: number): Middleware {
  return async (ctx, next) => {
    const contentLength = ctx.getHeader('content-length')

    if (contentLength !== undefined) {
      const size = parseInt(contentLength, 10)
      if (!isNaN(size)) {
        if (size > maxBytes) return tooLargeResponse()
        return next()
      }
      // NaN: Content-Length 無法解析，fall-through 到 body-read 路徑
    }

    // No Content-Length: read body and check actual byte size
    const body = await ctx.getBodyText()
    const byteSize = new TextEncoder().encode(body).byteLength
    if (byteSize > maxBytes) {
      return tooLargeResponse()
    }

    return next()
  }
}
