# Plan 17-02 Summary: IQueryBuilder aggregate() Primitive Definition

## Status: COMPLETED

Defined the `AggregateSpec<T>` contract and expression builder helpers, and extended the `IQueryBuilder` interface with the `aggregate<T>(spec)` method signature. This establishes the architectural contract for the following implementation plans.

## Key Changes

### Interface & Types
- Created `src/Shared/Infrastructure/Database/AggregateSpec.ts` defining the declarative aggregation DSL.
- Exported 10 builder functions: `sum`, `count`, `avg`, `min`, `max`, `dateTrunc`, `coalesce`, `add`, `col`.
- **Contract Widening:** `sum`, `avg`, `min`, and `max` accept `string | AggregateExpression` from v1, enabling nested compositions like `sum(add('input', 'output'))`.
- **Constraints:** `dateTrunc` is strictly limited to the `'day'` unit as per requirements.
- No ORM-specific (Drizzle/Atlas) types leaked into the spec definition.

### Port Abstraction
- Extended `IQueryBuilder` in `src/Shared/Infrastructure/IDatabaseAccess.ts` with the `aggregate<T>(spec: AggregateSpec): Promise<readonly T[]>` method.
- Verified that the `src/Shared/Domain/IDatabaseAccess.ts` re-export remains intact and correctly propagates the new method.

### Testing & Validation
- Created `src/Shared/Infrastructure/Database/__tests__/AggregateSpec.test.ts`.
- Verified that builders produce the correct tagged-object shapes.
- Confirmed that nested compositions are correctly structured.
- Verified type-level constraints (e.g., rejecting unsupported units or kinds) using `@ts-expect-error`.
- Confirmed that current adapter files (`DrizzleQueryBuilder.ts`, `MemoryDatabaseAccess.ts`, `AtlasQueryBuilder.ts`) now fail typecheck due to the missing `aggregate` implementation, which is the expected state before Plans 03, 04, and 05.

## Next Steps
- Implement `aggregate()` in `DrizzleQueryBuilder` (Plan 17-03).
- Implement `aggregate()` in `MemoryQueryBuilder` (Plan 17-04).
