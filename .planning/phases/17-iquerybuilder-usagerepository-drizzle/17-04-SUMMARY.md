# Plan 17-04 Summary: MemoryQueryBuilder aggregate() Implementation & Parity

## Status: COMPLETED

Implemented the `aggregate<T>(spec)` method in `MemoryQueryBuilder` with full behavioral parity to the Drizzle/SQL adapter, enabling pure-JS testing of all 5 production aggregate query shapes.

## Key Changes

### Memory Adapter Implementation
- Added `aggregate<T>(spec: AggregateSpec)` to `MemoryQueryBuilder.ts`.
- Implemented `evalExpression` and `reduceAggregate` to support all 9 `AggregateExpression` kinds.
- **SQL Parity (Empty Sets):** Updated `aggregate` to return exactly one row when no `groupBy` is present even if the table is empty, matching SQL behavior.
- **SQL Parity (Nulls):** Updated `sum`, `avg`, `min`, and `max` to return `null` instead of `0` when operating on empty sets or sets with only `null` values.
- **Nested Composition:** Fully supported Plan 02's widened contract allowing sum/avg/min/max to accept nested expressions.
- **Operator Normalization (Pitfall 5):** Normalized all where-clause operators to lowercase internally, ensuring `'LIKE'` and `'like'` behave identically.

### Testing & Validation
- Created `src/Shared/Infrastructure/Database/Adapters/Memory/__tests__/MemoryQueryBuilder.aggregate.test.ts` (13 tests).
- Created `src/Shared/Infrastructure/Database/__tests__/AggregateParity.test.ts` (5 tests) proving that Drizzle and Memory adapters produce byte-identical rows for all production query shapes.
- Verified that both `MemoryDatabaseAccess` and `DrizzleQueryBuilder` now pass typecheck cleanly.
- Confirmed no regressions in the `Dashboard` module.

## Next Steps
- Refactor `DrizzleUsageRepository` to use the new `aggregate()` method and remove direct `drizzle-orm` imports (Plan 17-05).
