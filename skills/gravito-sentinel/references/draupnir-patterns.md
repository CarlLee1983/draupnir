# Draupnir Patterns

`Draupnir` uses JWT-based auth for API flows and session-based auth for browser flows.

## Current signals

- `src/Shared/Infrastructure/Middleware/AuthMiddleware.ts`
- `src/Modules/Auth/Application/Services/LoginUserService.ts`
- `src/Modules/Auth/Application/Services/RefreshTokenService.ts`
- `src/Modules/Auth/Application/Services/LogoutUserService.ts`
- `src/Modules/Auth/Presentation/Routes/auth.routes.ts`

## Practical patterns

1. authenticate first, authorize second
2. keep token creation and verification in application/infrastructure services
3. keep route protection at the edge
4. keep permission logic in gate/policy-style helpers

## Reuse rules

- `jwt` for API clients and CLI flows
- `session` for browser flows
- `AuthContext` for request-scoped identity
- revocation repository when logout must invalidate existing JWTs

## Avoid

- calling `userOrFail()` after expensive work
- checking bearer tokens with case-sensitive string replacement
- letting middleware create its own infrastructure dependencies
