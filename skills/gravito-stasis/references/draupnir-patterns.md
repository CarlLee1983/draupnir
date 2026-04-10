# Draupnir Patterns

`Draupnir` uses cache for shared state, health checks, rate limiting, and hot-path lookups.

## Current signals

- `src/Shared/Infrastructure/Framework/GravitoCacheAdapter.ts`
- `src/Modules/Health/Domain/Services/HealthCheckService.ts`
- `src/Shared/Infrastructure/ICacheService.ts`

## Practical uses

- health probe cache round-trips
- org / user / module lookup caching
- rate limit counters
- distributed locks for cross-instance critical sections

## Rules

- keep cache keys stable and namespaced
- keep TTL explicit on write
- use Redis for multi-instance locks
- treat cache as a hint, not the source of truth

## Avoid

- storing giant aggregate snapshots unless you have an invalidation plan
- using memory locks in production with more than one instance
- hiding cache fallback behavior inside business logic
