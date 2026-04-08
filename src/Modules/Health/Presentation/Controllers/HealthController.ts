/**
 * HealthController
 * 健康檢查控制器 (HTTP 處理)
 *
 * 設計原則：
 * - 依賴通過構造函數注入（不訪問容器）
 * - 使用 IHttpContext 而不是 GravitoContext（框架無關）
 * - 純淨的業務邏輯實現
 * - 需要框架資源（db、redis、cache）時，通過 context 訪問
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'

export class HealthController {
	constructor(private service: PerformHealthCheckService) {}

	/**
	 * GET /health
	 * 執行健康檢查並返回結果
	 */
	async check(ctx: IHttpContext): Promise<Response> {
		try {
			// 從 context 中獲取框架資源（由 Wiring 層注入）
			const db = ctx.get<any>('__db')
			const redis = ctx.get<any>('__redis')
			const cache = ctx.get<any>('__cache')

			// 執行健康檢查
			const result = await this.service.execute(db, redis, cache)

			// 根據狀態返回適當的 HTTP 狀態碼
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
		} catch (error: any) {
			console.error('Health check error:', error)
			return ctx.json(
				{
					success: false,
					status: 'unhealthy',
					message: error.message || 'Health check failed',
				},
				503,
			)
		}
	}

	/**
	 * GET /health/history
	 * 獲取健康檢查歷史
	 */
	async history(ctx: IHttpContext): Promise<Response> {
		try {
			const limit = parseInt(ctx.query.limit || '10')
			const validLimit = Math.min(Math.max(limit, 1), 100) // 1-100 之間

			const records = await this.service.getHistory(validLimit)

			return ctx.json({
				success: true,
				data: records.map((r) => r.toJSON()),
				meta: {
					count: records.length,
					limit: validLimit,
				},
			})
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message,
				},
				500,
			)
		}
	}
}
