import { HealthCheck } from '../../Domain/Aggregates/HealthCheck'
import type { ISystemHealthChecker } from '../../Domain/Ports/ISystemHealthChecker'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'
import { HealthCheckDTO } from '../DTOs/HealthCheckDTO'

export class PerformHealthCheckService {
  constructor(
    private readonly repository: IHealthCheckRepository,
    private readonly healthChecker: ISystemHealthChecker,
  ) {}

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

  async getLatest(): Promise<HealthCheckDTO | null> {
    const check = await this.repository.findLatest()
    return check ? HealthCheckDTO.fromEntity(check) : null
  }

  async getHistory(limit: number = 10): Promise<HealthCheckDTO[]> {
    const checks = await this.repository.findAll(limit)
    return checks.map((check) => HealthCheckDTO.fromEntity(check))
  }
}
