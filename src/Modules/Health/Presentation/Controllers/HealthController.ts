import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'

export class HealthController {
  constructor(private readonly service: PerformHealthCheckService) {}

  async check(ctx: IHttpContext): Promise<Response> {
    try {
      const result = await this.service.execute()
      const statusCode = result.status === 'unhealthy' ? 503 : 200

      return ctx.json(
        {
          success: true,
          status: result.status,
          timestamp: result.timestamp,
          checks: result.checks,
          message: result.message,
        },
        statusCode,
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Health check failed'
      return ctx.json(
        {
          success: false,
          status: 'unhealthy',
          message,
        },
        503,
      )
    }
  }

  async history(ctx: IHttpContext): Promise<Response> {
    try {
      const limit = parseInt(ctx.query.limit || '10')
      const validLimit = Math.min(Math.max(limit, 1), 100)

      const records = await this.service.getHistory(validLimit)

      return ctx.json({
        success: true,
        data: records.map((r) => r.toJSON()),
        meta: {
          count: records.length,
          limit: validLimit,
        },
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to retrieve history'
      return ctx.json(
        {
          success: false,
          message,
        },
        500,
      )
    }
  }
}
