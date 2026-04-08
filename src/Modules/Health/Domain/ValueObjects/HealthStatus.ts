/**
 * HealthStatus Value Object
 * 不可變的健康狀態值物件
 */

export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy'

export class HealthStatus {
  readonly value: HealthStatusType

  constructor(value: HealthStatusType) {
    if (!['healthy', 'degraded', 'unhealthy'].includes(value)) {
      throw new Error(`Invalid health status: ${value}`)
    }
    this.value = value
  }

  /**
   * 判斷系統是否可用
   */
  isAvailable(): boolean {
    return this.value !== 'unhealthy'
  }

  /**
   * 判斷是否完全健康
   */
  isFullyHealthy(): boolean {
    return this.value === 'healthy'
  }

  /**
   * 判斷是否有警告
   */
  isDegraded(): boolean {
    return this.value === 'degraded'
  }

  /**
   * 值相等性檢查
   */
  equals(other: any): boolean {
    return other instanceof HealthStatus && other.value === this.value
  }

  /**
   * 轉換為字符串
   */
  toString(): string {
    return this.value
  }

  /**
   * 靜態工廠方法
   */
  static healthy(): HealthStatus {
    return new HealthStatus('healthy')
  }

  static degraded(): HealthStatus {
    return new HealthStatus('degraded')
  }

  static unhealthy(): HealthStatus {
    return new HealthStatus('unhealthy')
  }
}
