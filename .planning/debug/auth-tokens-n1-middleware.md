---
slug: auth-tokens-n1-middleware
status: resolved
trigger: "修正 middleware n+1 問題"
created: 2026-04-20
updated: 2026-04-20
---

## Symptoms

- **Expected**: auth middleware checks token once per request
- **Actual**: 5 similar queries executed within 1000ms on single GET /manager/dashboard (200ms, 266ms response)
- **Error**: Atlas N+1 warning — `SELECT * FROM "auth_tokens" WHERE "token_hash" = $1 LIMIT 1`
- **Route**: GET /manager/dashboard ← 200 266ms
- **Table**: auth_tokens

## Current Focus

hypothesis: "AuthMiddleware.handle() has no idempotency guard — every caller that invokes .handle(ctx) fires a fresh DB query even if auth is already resolved on the context. For GET /manager/dashboard, it fires twice: once from attachJwt() in webBase(), and once from requireOrganizationContext() which has its own jwtParser singleton."
test: ""
expecting: ""
next_action: "resolved"
reasoning_checkpoint: "The manager middleware stack is: attachJwt() → tokenRefresh → csrfAttach → requireManager → requireOrganizationContext → injectSharedData → pendingCookies. Both attachJwt and requireOrganizationContext call jwtParser.handle(ctx) unconditionally. The Atlas N+1 detector fires at >=5 similar queries within 1000ms globally, so 2-3 rapid page loads each contributing 2 queries triggers the warning."

## Evidence

- timestamp: 2026-04-20T00:00:00Z
  finding: "AuthMiddleware.handle() had no idempotency guard — each .handle(ctx) could run the full flow including auth_tokens SELECT"
  file: src/Shared/Infrastructure/Middleware/AuthMiddleware.ts

- timestamp: 2026-04-20T00:00:01Z
  finding: "requireOrganizationContext() uses a module-level jwtParser singleton and previously called getJwtParser().handle(ctx) unconditionally (same stack as attachJwt in webBase())."
  file: src/Modules/Organization/Presentation/Middleware/OrganizationMiddleware.ts (~105-106)

- timestamp: 2026-04-20T00:00:02Z
  finding: "manager() middleware group = [...webBase(), requireManagerMiddleware(), requireOrganizationContext(), ...]. webBase() includes attachJwt() which is the first DB query. requireOrganizationContext() is the second. Two auth_tokens queries per request."
  file: src/Website/Http/HttpKernel.ts:114-120

- timestamp: 2026-04-20T00:00:03Z
  finding: "Atlas N+1 threshold is 5 queries in 1000ms — 3 rapid page loads (3×2=6 queries) easily exceed this."

## Eliminated

- OrganizationMemberRepository queries (already cached via OrganizationMemberLookupCacheMiddleware)
- Dashboard page services (ListApiKeysService, GetActiveOrgContractQuotaService, SumQuotaAllocatedForOrgService) — none touch auth_tokens
- TokenRefreshMiddleware — skips when auth is already set (isAuthenticated check on line 58)
- requireManagerMiddleware — reads from ctx.get('auth'), no DB

## Resolution

root_cause: "AuthMiddleware.handle() had no idempotency guard. requireOrganizationContext() also called jwtParser.handle(ctx), so the same request could hit SELECT * FROM auth_tokens WHERE token_hash = $1 LIMIT 1 twice (attachJwt + requireOrganizationContext)."

fix: |
  Request-scoped marker `jwtParsed` on the HTTP context:
  - `AuthMiddleware.markParsed(ctx)` runs at the start of `handle()`, before any DB work; `hasParsed(ctx)` short-circuits re-entrant calls so the full flow (including auth_tokens) runs at most once per request.
  - `requireOrganizationContext()` calls `getJwtParser().handle(ctx)` only when `!AuthMiddleware.hasParsed(ctx)`.

  Why not only `isAuthenticated()` / `ctx.get('auth')`? Guarding on **parsed-once** also skips the second DB round-trip when the first attempt already failed (expired, revoked, malformed token) — not only when login succeeded.

verification: "Re-run tsc and relevant tests after changes; Atlas should no longer see duplicate auth_tokens SELECTs per request from this stack."

files_changed: "src/Shared/Infrastructure/Middleware/AuthMiddleware.ts, src/Modules/Organization/Presentation/Middleware/OrganizationMiddleware.ts"
