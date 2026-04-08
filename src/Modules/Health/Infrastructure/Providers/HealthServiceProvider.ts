/**
 * HealthServiceProvider
 * 健康模組的服務提供者 (依賴注入)
 *
 * 設計原則：
 * - 繼承框架無關的 ModuleServiceProvider
 * - 只負責註冊領域和應用層依賴
 * - 不訪問 Gravito 框架（framework-agnostic）
 * - boot() 中的框架特定初始化由適配層處理
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'
import { MemoryHealthCheckRepository } from '../Repositories/MemoryHealthCheckRepository'
import { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'

export class HealthServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊服務到容器
	 * 在這裡定義所有的依賴注入和單例
	 *
	 * @param container - 框架無關的容器介面
	 */
	override register(container: IContainer): void {
		// 1. 註冊 Repository (單例)
		container.singleton('healthRepository', () => {
			return new MemoryHealthCheckRepository()
		})

		// 2. 註冊 Application Service（每次解析新建實例）
		container.bind('healthCheckService', (c: IContainer) => {
			const repository = c.make('healthRepository') as IHealthCheckRepository
			return new PerformHealthCheckService(repository)
		})
	}

	/**
	 * 啟動時執行初始化邏輯
	 *
	 * 注意：如果需要訪問框架特定資源（如 Gravito 的 db、redis、cache），
	 * 應由 Wiring 層或適配層在啟動後執行。
	 */
	override boot(_context: any): void {
		console.log('💚 [Health] Module loaded')

		// 框架特定的初始化（如執行初始健康檢查）
		// 應由適配層或 Wiring 層處理，而不是在這裡
	}
}
