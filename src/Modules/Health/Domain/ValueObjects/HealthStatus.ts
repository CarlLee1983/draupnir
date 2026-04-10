/**
 * HealthStatus Value Object
 * 不可變的健康狀態值物件
 */

import { ValueObject } from '@/Shared/Domain/ValueObject'

export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy'

export class HealthStatus extends ValueObject {
  private readonly value: HealthStatusType

  private constructor(value: HealthStatusType) {
    super()
    if (!['healthy', 'degraded', 'unhealthy'].includes(value)) {
      throw new Error(`Invalid health status: ${value}`)
    }
    this.value = value
  }

  get rawValue(): HealthStatusType {
    return this.value
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
  equals(other: ValueObject): boolean {
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

  static from(value: string): HealthStatus {
    return new HealthStatus(value as HealthStatusType)
  }
}
