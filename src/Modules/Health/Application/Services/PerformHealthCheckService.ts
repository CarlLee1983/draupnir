/**
 * PerformHealthCheckService
 * 應用服務：執行和記錄健康檢查
 */

import { HealthCheck } from '../../Domain/Aggregates/HealthCheck'
import { HealthCheckDTO } from '../DTOs/HealthCheckDTO'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'
import type { ISystemHealthChecker } from '../../Domain/Ports/ISystemHealthChecker'

export class PerformHealthCheckService {
  constructor(
    private readonly repository: IHealthCheckRepository,
    private readonly healthChecker: ISystemHealthChecker,
  ) {}

  /**
   * 執行健康檢查並保存結果
   */
  async execute(): Promise<HealthCheckDTO> {
    const [database, redis, cache] = await Promise.all([
      this.healthChecker.checkDatabase(),
      this.healthChecker.checkRedis(),
      this.healthChecker.checkCache(),
    ])

    const checks = { database, redis, cache }
    const healthCheck = HealthCheck.create(`health-${Date.now()}`, checks)
    await this.repository.save(healthCheck)
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
