/**
 * HealthController
 * 健康檢查控制器 (HTTP 處理)
 *
 * 設計原則：
 * - 依賴通過構造函數注入（不訪問容器）
 * - 使用 IHttpContext 而不是 GravitoContext（框架無關）
 * - 純淨的業務邏輯實現
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'

export class HealthController {
  constructor(private readonly service: PerformHealthCheckService) {}

  /**
   * GET /health
   * 執行健康檢查並返回結果
   */
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

  /**
   * GET /health/history?limit=10
   * 獲取健康檢查歷史
   */
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
