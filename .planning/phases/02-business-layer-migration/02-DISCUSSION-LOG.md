# Phase 2: Business-Layer Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 02-business-layer-migration
**Areas discussed:** Plan granularity, Retry improvement scope, CliApi exemption boundary

---

## Plan Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Per module — 5 plans | One plan per module; each covers service migration + wire function + test rewrite. Services are independent, plans can parallel-execute. | ✓ |
| Per service — ~9 plans | One plan per service for maximum granularity. More overhead. | |
| All-at-once — 1 plan | Single plan for all 7 services, 5 wire functions, all tests. Large diff. | |

**User's choice:** Per module — 5 plans
**Notes:** AppApiKey, ApiKey, Credit, SdkApi, Dashboard. Each plan = one module clean.

---

## Retry Improvement Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Both execute() and retryPending() | Both methods get the retryable check. retryPending() currently swallows ALL errors silently — permanent failures now get logged. | ✓ |
| execute() only | Minimal scope: only execute()'s catch block changes. retryPending() keeps the empty catch. | |

**User's choice:** Both execute() and retryPending()
**Notes:** Non-retryable GatewayErrors in retryPending() should be logged at error severity, not silently swallowed. Permanent failures (e.g. NOT_FOUND) must not accumulate in the retry queue forever.

---

## CliApi Exemption Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — exempt, document it | CliApi uses bifrostClient only for ProxyCliRequestService. Out of scope per PROJECT.md. Document to prevent accidental migration. | ✓ |
| Migrate CliApi too | Bring CliApiServiceProvider's ProxyCliRequestService into scope. | |

**User's choice:** Exempt — document it
**Notes:** `bifrostClient as any` cast in CliApiServiceProvider is intentional for ProxyModelCall. After Phase 2, CliApi will be the only remaining `BifrostClient` importer in `src/Modules/` — this is expected and must not trigger CI failures.

---

## Claude's Discretion

- Exact test fixture structure within each module
- Whether `HandleCreditToppedUpService` needs retryable logging (no existing retry loop — planner to assess)
- Import organization for `ILLMGatewayClient` (barrel vs direct path)

## Deferred Ideas

- HandleCreditToppedUpService retry loop — no retry loop today; don't add behavior in Phase 2
- UsageQuery field widening — widen in the plan if needed, not here
- CliApi migration — deferred indefinitely
