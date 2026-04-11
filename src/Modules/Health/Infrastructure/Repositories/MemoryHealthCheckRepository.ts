import { HealthCheck } from '../../Domain/Aggregates/HealthCheck'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'

export class MemoryHealthCheckRepository implements IHealthCheckRepository {
  private checks: Map<string, HealthCheck> = new Map()
  private readonly maxRecords = 100

  async findById(id: string): Promise<HealthCheck | null> {
    return this.checks.get(id) || null
  }

  async findLatest(): Promise<HealthCheck | null> {
    let latest: HealthCheck | null = null
    let latestTime = 0

    for (const check of this.checks.values()) {
      const time = check.timestamp.getTime()
      if (time > latestTime) {
        latestTime = time
        latest = check
      }
    }

    return latest
  }

  async findAll(limit: number = 10): Promise<HealthCheck[]> {
    const checks = Array.from(this.checks.values())
    return checks.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit)
  }

  async save(check: HealthCheck): Promise<void> {
    this.checks.set(check.id, check)

    if (this.checks.size > this.maxRecords) {
      const sorted = Array.from(this.checks.values()).sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      )

      const toDelete = sorted.slice(0, this.checks.size - this.maxRecords)
      for (const record of toDelete) {
        this.checks.delete(record.id)
      }
    }
  }

  async deleteOlderThan(days: number): Promise<number> {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000
    let deleted = 0

    for (const [id, check] of this.checks.entries()) {
      if (check.timestamp.getTime() < cutoffTime) {
        this.checks.delete(id)
        deleted++
      }
    }

    return deleted
  }
}
