# Module Test Coverage Matrix

**Date**: 2026-04-25  
**Status**: Initial audit / planning matrix  
**Purpose**: Provide a module-by-module testing hardening map for applying the Acceptance-First TDD pattern across Draupnir without binding the project to any workflow tool.

**Related**:
- [`acceptance-first-tdd-pattern.md`](./acceptance-first-tdd-pattern.md)
- [`2026-04-24-ddd-acceptance-testing-design.md`](./2026-04-24-ddd-acceptance-testing-design.md)

---

## 1. How to read this matrix

| Marker | Meaning |
|--------|---------|
| `Good` | Meaningful coverage exists for the layer; still review for gaps before risky changes. |
| `Partial` | Some coverage exists, but important user stories or edge cases are likely missing. |
| `Missing` | No clear coverage found for this layer. |
| `N/A` | Layer is not normally required for this module. |

This is not a coverage-percentage report. It is a risk and workflow map: which business behaviors would break without tests catching them?

---

## 2. Current evidence snapshot

Generated from repository inspection on 2026-04-25.

| Area | Current state |
|------|---------------|
| Module unit tests | All modules except `Health` have module-local tests. |
| Acceptance UseCases | Present for `Auth`, `Credit`, and `Organization`; Auth now includes session, logout, password reset, email verification, token expiry, and admin status-change lifecycles. |
| API Contract acceptance | Present for `Auth`, `Credit`, and `Organization`; Auth now includes reset/verification/status endpoint contracts. |
| Feature/OpenAPI tests | Existing broad `tests/Feature/*.e2e.ts` coverage remains as route/spec safety net. |
| Browser E2E | Existing browser flows cover Auth, admin/member portals, CLI device flow, and dashboards. |
| Known verification blocker | Duplicate `sha256` import in `tests/Acceptance/support/http/TestAuth.ts` resolved by the Auth hardening slice. |

---

## 3. Module matrix

| Module | Unit Coverage | Acceptance UseCase | API Contract | E2E / Feature | Priority | Main gaps to close |
|--------|---------------|--------------------|--------------|---------------|----------|--------------------|
| `Auth` | Good | Good | Good | Good | P0 | Google OAuth acceptance remains as a follow-up because it depends on OAuth adapter contract fakes; current slice covers password reset, email verification, token expiry/clock behavior, and admin status changes. |
| `Credit` | Good | Good | Good | Partial | P0 | Review gaps after usage/backfill changes; keep money/idempotency paths under acceptance. |
| `Organization` | Good | Good | Partial | Good | P0 | Finish endpoint-level contract coverage for member/invitation/status/update/remove flows; verify current uncommitted acceptance changes before expanding. |
| `ApiKey` | Good | Missing | Missing | Partial | P0 | Key lifecycle acceptance, Bifrost/gateway side effects, revoke/assign/budget/permission contract coverage. |
| `AppApiKey` | Good | Missing | Missing | Partial | P0 | App key issue/rotate/revoke/scope acceptance and API contract; manager-only write behavior. |
| `SdkApi` | Good | Missing | Missing | Partial | P0 | SDK auth contract, app key permission failures, proxy usage/balance acceptance with real middleware. |
| `Contract` | Good | Missing | Missing | Partial | P1 | Contract lifecycle acceptance, quota enforcement, expiry handling, API contract. |
| `AppModule` | Partial | Missing | Missing | Partial | P1 | Module subscription/default provisioning acceptance, module access contract. |
| `Alerts` | Good | Missing | Missing | Partial | P1 | Budget threshold acceptance, webhook delivery fake, duplicate threshold/idempotency, alert endpoints contract. |
| `Reports` | Partial | Missing | Missing | Partial | P1 | Scheduled report acceptance with `ManualScheduler`/`TestClock`, snapshot/report-token/email side effects, endpoint contract. |
| `Dashboard` | Good | Missing | Missing | Good | P1 | Bifrost sync/backfill acceptance using real DI/DB, dashboard endpoints contract, cursor/backfill idempotency at acceptance layer. |
| `CliApi` | Good | Missing | Missing | Good | P1 | Device flow acceptance across initiate/authorize/exchange/revoke, CLI API contract. |
| `Profile` | Partial | Missing | Missing | Partial | P2 | Profile update/get contract, UserRegistered cross-module acceptance already observed via Auth but should be explicit if Profile evolves. |
| `DevPortal` | Good | Missing | Missing | Partial | P2 | Application registration, webhook config, app key management acceptance/API contract. |
| `Health` | Missing | N/A | Missing | Partial | P2 | Minimal health route contract; no domain/application layer expected unless behavior grows. |

---

## 4. Recommended hardening order

### Phase 0 — unblock and stabilize

1. Fix duplicate `sha256` import in `tests/Acceptance/support/http/TestAuth.ts`.
2. Resolve or commit the existing uncommitted Organization acceptance changes before starting broad test work.
3. Run targeted acceptance smoke after the cleanup:

```bash
bun test tests/Acceptance/smoke.spec.ts tests/Acceptance/smoke-db.spec.ts
bun run typecheck
```

### Phase 1 — P0 security, money, access boundaries

1. `Auth`
2. `Organization`
3. `ApiKey` + `AppApiKey` + `SdkApi`
4. `Credit` gap review, not a rewrite

> Auth hardening note: Password reset, email verification, token expiry, and admin status-change coverage were completed in the first implementation slice. Google OAuth acceptance should be planned separately because it needs a dedicated OAuth adapter fake and callback contract review.

### Phase 2 — P1 operational flows

1. `Alerts`
2. `Reports`
3. `Dashboard`
4. `Contract` + `AppModule`
5. `CliApi`

### Phase 3 — P2 support and portal flows

1. `Profile`
2. `DevPortal`
3. `Health`
4. Browser-only Website flows, only where lower-level tests cannot prove behavior

---

## 5. Per-module execution recipe

For each module, do not start by asking “which classes lack tests?” Start with user stories.

```text
1. List module user stories and public endpoints.
2. Create a TDD Slice for each high-risk story.
3. Add/adjust unit tests for domain/application rules.
4. Add acceptance use case tests for complete business flows.
5. Add API contract tests for endpoint/auth/validation/response behavior.
6. Remove or demote obsolete duplicate tests only after stronger coverage exists.
7. Run targeted verification and record blockers separately from this module's failures.
```

Use the lightweight templates:

- TDD Slice: [`docs/templates/tdd-slice.md`](../../templates/tdd-slice.md)
- Use case spec: `tests/Acceptance/templates/use-case.spec.template.ts`
- API contract spec: `tests/Acceptance/templates/api-contract.spec.template.ts`

---

## 6. Module done definition

A module is considered “test-hardened” when:

- [ ] Main user stories are listed and mapped to tests.
- [ ] Domain invariants have unit tests.
- [ ] Application service success/error/permission/idempotency branches have unit tests where applicable.
- [ ] Main business flows have acceptance use cases with real DI, real DB, and real events.
- [ ] Public HTTP endpoints have API contract coverage for happy path, auth/permission failure, and validation failure.
- [ ] Cross-module side effects are asserted via acceptance tests.
- [ ] Internal repositories, application services, auth middleware, and validation are not mocked.
- [ ] Targeted tests pass.
- [ ] Typecheck/lint pass, or unrelated blockers are documented with exact errors.

---

## 7. First suggested concrete work item

Start with `Auth` because it is security-critical and already has acceptance infrastructure.

Suggested first Auth hardening slices:

1. Password reset lifecycle: request reset → reset password → active sessions revoked → expired token rejected.
2. Email verification lifecycle: token issued → verify → duplicate/expired token rejected.
3. Token expiry behavior: access/refresh expiry controlled by `TestClock`.
4. Admin status changes: suspended user cannot login or access protected routes.

Expected files:

```text
src/Modules/Auth/__tests__/ResetPasswordService.test.ts
tests/Acceptance/UseCases/Auth/password-reset-lifecycle.spec.ts
tests/Acceptance/UseCases/Auth/email-verification-lifecycle.spec.ts
tests/Acceptance/ApiContract/auth-endpoints.spec.ts
```
