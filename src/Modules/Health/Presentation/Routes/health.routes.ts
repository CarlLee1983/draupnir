/**
 * Health Routes
 * 健康檢查模組的路由定義（框架無關）
 *
 * 路由層只負責：
 * 1. 接收已組裝的 controller（依賴注入已完成）
 * 2. 接收框架無關的 IModuleRouter（適配層在 wiring 層完成）
 * 3. 定義路由與 controller 方法的映射
 *
 * 好處：
 * - Routes 不依賴任何框架
 * - Routes 不知道依賴注入容器
 * - 可輕鬆抽換框架（只需修改 wiring 層）
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { HealthController } from '../Controllers/HealthController'

/**
 * 註冊健康檢查路由
 *
 * @param router - 框架無關的模組路由介面
 * @param controller - 已組裝的控制器實例（依賴已注入）
 */
export function registerHealthRoutes(
	router: IModuleRouter,
	controller: HealthController,
): void {
	/**
	 * GET /health
	 * 執行健康檢查
	 * 返回: { success, status, timestamp, checks, message }
	 */
	router.get('/health', (ctx) => controller.check(ctx))

	/**
	 * GET /health/history?limit=10
	 * 獲取健康檢查歷史
	 * 參數: limit (可選, 預設 10, 最多 100)
	 */
	router.get('/health/history', (ctx) => controller.history(ctx))
}
