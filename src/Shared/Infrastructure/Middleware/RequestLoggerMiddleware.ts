import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function resolveLogLevel(): LogLevel {
  const env = process.env.LOG_LEVEL as LogLevel | undefined
  if (env && env in LOG_LEVEL_RANK) return env
  return process.env.NODE_ENV === 'production' ? 'error' : 'debug'
}

function shouldLog(status: number, level: LogLevel): boolean {
  if (level === 'debug') return true
  if (level === 'info') return status >= 300
  if (level === 'warn') return status >= 400
  return status >= 500 // error
}

function resolveLevel(status: number): LogLevel {
  if (status >= 500) return 'error'
  if (status >= 400) return 'warn'
  if (status >= 300) return 'info'
  return 'debug'
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  env: string
  requestId: string
  method: string
  path: string
  status: number
  durationMs: number
  ip: string
  userAgent: string
  msg?: string
  error?: string
}

/**
 * Middleware that logs each request as structured JSON (production) or
 * colored text (debug). Controlled by the LOG_LEVEL environment variable.
 *
 * Log level thresholds:
 * - debug: all requests (colored text)
 * - info:  3xx, 4xx, 5xx (JSON)
 * - warn:  4xx, 5xx (JSON)
 * - error: 5xx only (JSON)  ← production default
 *
 * Default: LOG_LEVEL=error when NODE_ENV=production, otherwise LOG_LEVEL=debug.
 */
export function createRequestLoggerMiddleware(): Middleware {
  return async (ctx, next) => {
    // Resolved per-request from process.env.LOG_LEVEL (not at middleware creation time)
    const configuredLevel = resolveLogLevel()
    const start = Date.now()
    const method = ctx.getMethod()
    const path = ctx.getPathname()
    const requestId = ctx.get<string>('requestId') ?? 'unknown'
    const ip = ctx.getHeader('x-forwarded-for') ?? ctx.getHeader('x-real-ip') ?? 'unknown'
    const userAgent = ctx.getHeader('user-agent') ?? 'unknown'
    const env = process.env.NODE_ENV ?? 'development'

    function emit(status: number, extra?: { msg?: string; error?: string }): void {
      const durationMs = Date.now() - start
      if (!shouldLog(status, configuredLevel)) return

      const level = resolveLevel(status)

      if (configuredLevel === 'debug') {
        // Colored text for local development
        const arrow = status >= 400 ? '\x1b[31m←\x1b[0m' : '\x1b[32m←\x1b[0m'
        console.log(`\x1b[36m→\x1b[0m ${method} ${path}\n${arrow} ${status}  ${durationMs}ms`)
        return
      }

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        env,
        requestId,
        method,
        path,
        status,
        durationMs,
        ip,
        userAgent,
        ...extra,
      }
      console.log(JSON.stringify(entry))
    }

    try {
      const response = await next()
      emit(response.status)
      return response
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      emit(500, { msg: error.message, error: error.constructor.name })
      throw err
    }
  }
}
