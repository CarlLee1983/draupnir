# Plan 17-01 Summary: usage_records.credit_cost Migration to REAL

## Status: COMPLETED

Migrated the `credit_cost` column in the `usage_records` table from `TEXT` to `REAL` to improve performance and accuracy of analytical queries.

## Key Changes

### Database & Persistence
- Created Atlas migration `2026_04_12_000003_change_usage_records_credit_cost_to_real.ts` using the safe ADD-COPY-DROP-RENAME pattern for SQLite.
- Successfully executed the migration manually due to environment configuration issues with the `orbit` CLI.
- Updated Drizzle schema in `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` to use `real()` for the `credit_cost` column.

### Application & Infrastructure
- Updated `UsageRecordInsert` interface in `IUsageRepository.ts` to use `number` for `creditCost`.
- Refactored `DrizzleUsageRepository.ts` to remove all `CAST(... AS REAL)` wrappers, as the column is now natively numeric.
- Updated `BifrostSyncService.ts` to stop coercing costs to strings before insertion.

### Testing
- Updated `DrizzleUsageRepository.test.ts` to reflect the schema change and use numeric fixtures.
- Verified that all 21 tests in the Dashboard module pass correctly.

## Next Steps
- Implement `IQueryBuilder` aggregation primitives (Plan 17-02).
