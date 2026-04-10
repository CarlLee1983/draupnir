/**
 * HealthCheckService
 * 領域服務：解讀系統健康檢查結果
 */

import type { SystemChecks } from './SystemChecks'

export { type SystemChecks }

/**
 * Domain service: determines overall system health from individual check results.
 * No infrastructure knowledge — receives pre-checked results.
 */
export class HealthCheckService {
  determineOverallStatus(checks: SystemChecks): {
    allHealthy: boolean
    message: string
  } {
    const allHealthy =
      checks.database && checks.redis !== false && checks.cache !== false
    return {
      allHealthy,
      message: allHealthy ? 'All systems operational' : 'Some services degraded',
    }
  }
}
