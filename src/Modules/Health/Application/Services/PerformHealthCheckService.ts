/**
 * PerformHealthCheckService
 * 應用服務：執行和記錄健康檢查
 */

import { HealthCheckService } from '../../Domain/Services/HealthCheckService'
import { HealthCheck } from '../../Domain/Aggregates/HealthCheck'
import { HealthCheckDTO } from '../DTOs/HealthCheckDTO'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'

export class PerformHealthCheckService {
  private domainService: HealthCheckService

  constructor(private repository: IHealthCheckRepository) {
    this.domainService = new HealthCheckService()
  }

  /**
   * 執行健康檢查並保存結果
   */
  async execute(db: any, redis?: any, cache?: any): Promise<HealthCheckDTO> {
    // 1. 執行系統檢查 (Domain Service)
    const checks = await this.domainService.checkSystem(db, redis, cache)

    // 2. 創建聚合根 (Domain Layer)
    const healthCheck = HealthCheck.create(`health-${Date.now()}`, checks)

    // 3. 保存到倉庫 (Infrastructure)
    await this.repository.save(healthCheck)

    // 4. 轉換為 DTO (應用層)
    return HealthCheckDTO.fromEntity(healthCheck)
  }

  /**
   * 獲取最後一次健康檢查
   */
  async getLatest(): Promise<HealthCheckDTO | null> {
    const check = await this.repository.findLatest()
    return check ? HealthCheckDTO.fromEntity(check) : null
  }

  /**
   * 獲取健康檢查歷史
   */
  async getHistory(limit: number = 10): Promise<HealthCheckDTO[]> {
    const checks = await this.repository.findAll(limit)
    return checks.map((check) => HealthCheckDTO.fromEntity(check))
  }
}
