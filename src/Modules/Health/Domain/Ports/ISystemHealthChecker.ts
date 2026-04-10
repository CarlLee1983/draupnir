/**
 * Port interface for system health checking.
 * Infrastructure will provide implementations for DB, Redis, Cache connectivity checks.
 */
export interface ISystemHealthChecker {
  checkDatabase(): Promise<boolean>
  checkRedis(): Promise<boolean>
  checkCache(): Promise<boolean>
}
