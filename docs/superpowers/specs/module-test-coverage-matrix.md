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
| Acceptance UseCases | Present for `Auth`, `Credit`, `Organization`, `ApiKey`, and `AppApiKey`. Auth includes session, logout, password reset, email verification, token expiry, and admin status-change lifecycles. Organization includes member lifecycle and access control. |
| API Contract acceptance | Present for `Auth`, `Credit`, and `Organization`. |
| Feature/OpenAPI tests | Existing broad `tests/Feature/*.e2e.ts` coverage remains as route/spec safety net. |
| Browser E2E | Existing browser flows cover Auth, admin/member portals, CLI device flow, and dashboards. |
| Known verification blocker | Resolved duplicate `sha256` and uncommitted organization change debt. |

---

## 3. Module matrix

| Module | Unit Coverage | Acceptance UseCase | API Contract | E2E / Feature | Priority | Main gaps to close |
|--------|---------------|--------------------|--------------|---------------|----------|--------------------|
| `Auth` | Good | Good | Good | Good | P0 | Google OAuth acceptance remains as a follow-up because it depends on OAuth adapter contract fakes. |
| `Credit` | Good | Good | Good | Partial | P0 | Review gaps after usage/backfill changes. |
| `Organization` | Good | Good | Good | Good | P0 | Gaps closed for member lifecycle, invitation, and role-based access control. |
| `ApiKey` | Good | Good | Partial | Partial | P0 | API contract hardening; Bifrost/gateway side effects verified via acceptance but could use explicit contract tests. |
| `AppApiKey` | Good | Good | Partial | Partial | P0 | API contract hardening; scope/manager-only write behavior verified via acceptance. |
| `SdkApi` | Good | Missing | Missing | Partial | P0 | SDK auth contract, app key permission failures, proxy usage/balance acceptance with real middleware. |
| `Contract` | Good | Missing | Missing | Partial | P1 | Contract lifecycle acceptance, quota enforcement, expiry handling, API contract. |
| `AppModule` | Partial | Missing | Missing | Partial | P1 | Module subscription/default provisioning acceptance, module access contract. |
| `Alerts` | Good | Missing | Missing | Partial | P1 | Budget threshold acceptance, webhook delivery fake, duplicate threshold/idempotency, alert endpoints contract. |
| `Reports` | Partial | Missing | Missing | Partial | P1 | Scheduled report acceptance with `ManualScheduler`/`TestClock`, snapshot/report-token/email side effects, endpoint contract. |
| `Dashboard` | Good | Missing | Missing | Good | P1 | Bifrost sync/backfill acceptance using real DI/DB, dashboard endpoints contract, cursor/backfill idempotency at acceptance layer. |
| `CliApi` | Good | Missing | Missing | Good | P1 | Device flow acceptance across initiate/authorize/exchange/revoke, CLI API contract. |
| `Profile` | Partial | Missing | Missing | Partial | P2 | Profile update/get contract, UserRegistered cross-module acceptance already observed via Auth but should be explicit if Profile evolves. |
| `DevPortal` | Good | Missing | Missing | Partial | P2 | Application registration, webhook config, app key management acceptance/API contract. |
| `Health` | Missing | N/A | Missing | Partial | P2 | Minimal health route contract. |

---

## 4. Recommended hardening order

### Phase 0 — unblock and stabilize

1. Auth, Organization, and API Key hardening completed.
2. Verified all acceptance tests pass:

```bash
bun test tests/Acceptance/
bun run typecheck
```

### Phase 1 — P0 security, money, access boundaries

1. `SdkApi`
2. `Credit` gap review, not a rewrite
3. `Contract` + `AppModule`

### Phase 2 — P1 operational flows

1. `Alerts`
2. `Reports`
3. `Dashboard`
4. `CliApi`

### Phase 3 — P2 support and portal flows

1. `Profile`
2. `DevPortal`
3. `Health`

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

## 7. Next suggested concrete work item

With `Auth`, `Organization`, and `ApiKey` hardening largely complete, the next priority is **SdkApi** and **Credit** review.

Suggested SdkApi hardening slices:

1. SDK Auth: verify that an SDK can authenticate using valid keys and is rejected with invalid ones.
2. Permission failures: verify that an authenticated SDK is rejected when trying to access resources it doesn't have permissions for.
3. Proxy/Balance integration: verify that SDK requests correctly check and deduct balance via the real middleware stack.

Expected files:

```text
tests/Acceptance/UseCases/SdkApi/sdk-auth-flows.spec.ts
tests/Acceptance/ApiContract/sdk-api-endpoints.spec.ts
```
