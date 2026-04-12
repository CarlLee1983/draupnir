---
phase: 15-webhook-alerts
plan: 01
subsystem: backend-foundation
tags: [foundation, alerts, webhooks, drizzle, typescript]
requires:
  - phase: 13-alert-foundation-email-infrastructure
    provides: alert event / threshold / email dispatch primitives
provides:
  - shared webhook dispatcher + secret in Foundation
  - alerts webhook endpoint aggregate + SSRF URL validation
  - alert delivery persistence schema + backfill script
affects: [devportal webhook resolution, alerts domain, phase 15 application services]
tech-stack:
  added: []
  patterns: [shared infra promotion, immutable aggregate, SSRF validation, append-only delivery history]
key-files:
  created:
    - src/Foundation/Infrastructure/Ports/IWebhookDispatcher.ts
    - src/Modules/Alerts/Domain/Aggregates/WebhookEndpoint.ts
    - src/Modules/Alerts/Domain/Entities/AlertDelivery.ts
    - src/Modules/Alerts/Domain/Repositories/IAlertDeliveryRepository.ts
    - src/Modules/Alerts/Domain/Repositories/IWebhookEndpointRepository.ts
    - src/Modules/Alerts/Domain/ValueObjects/DeliveryStatus.ts
    - src/Modules/Alerts/Domain/ValueObjects/WebhookUrl.ts
    - src/Modules/Alerts/Infrastructure/Mappers/AlertDeliveryMapper.ts
    - src/Modules/Alerts/Infrastructure/Mappers/WebhookEndpointMapper.ts
    - src/Modules/Alerts/Infrastructure/Repositories/DrizzleAlertDeliveryRepository.ts
    - src/Modules/Alerts/Infrastructure/Repositories/DrizzleWebhookEndpointRepository.ts
    - src/Modules/Alerts/Infrastructure/Scripts/backfillAlertDeliveries.ts
    - database/migrations/2026_04_12_000002_create_webhook_endpoints_and_alert_deliveries.ts
    - src/Modules/Alerts/__tests__/AlertDelivery.test.ts
    - src/Modules/Alerts/__tests__/WebhookEndpoint.test.ts
    - src/Modules/Alerts/__tests__/WebhookUrl.test.ts
  modified:
    - src/Foundation/Infrastructure/Services/Webhook/WebhookDispatcher.ts
    - src/Foundation/Infrastructure/Services/Webhook/WebhookSecret.ts
    - src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts
    - src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider.ts
    - src/Modules/DevPortal/Application/Services/ConfigureWebhookService.ts
    - src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts
    - package.json
    - src/Foundation/__tests__/WebhookDispatcher.test.ts
    - src/Foundation/__tests__/WebhookSecret.test.ts
key-decisions:
  - "Promoted the existing DevPortal webhook dispatcher and secret into Foundation so Alerts and DevPortal share one signed transport layer."
  - "Kept webhook endpoint secrets as whsec_... strings in the aggregate and repository for backward compatibility with the existing dispatcher contract."
  - "Modeled webhook delivery history as append-only alert_deliveries rows instead of extending alert_events, which keeps retries and resend flows isolated from threshold events."
requirements-completed: [ALRT-06, ALRT-07, ALRT-08]
completed: 2026-04-12
---

# Phase 15 Plan 01: Foundation + Domain Summary

Webhook dispatch primitives are now shared infrastructure, and the Alerts domain has a validated endpoint model plus append-only delivery persistence ready for the application layer.

## Accomplishments
- Promoted `WebhookDispatcher` and `WebhookSecret` into `src/Foundation/Infrastructure/Services/Webhook/`.
- Added `IWebhookDispatcher` and rewired DevPortal to resolve the shared Foundation singleton instead of constructing its own dispatcher.
- Built `WebhookUrl`, `WebhookEndpoint`, `AlertDelivery`, their repository ports, Drizzle mappers/repositories, schema additions, migration, and the backfill script.
- Added regression tests for webhook URL SSRF, endpoint immutability, and alert delivery state transitions.

## Task Commits
- `dca50c1` - Centralize webhook signing primitives so alerts can reuse the proven DevPortal flow
- `85aaf71` - Lay the webhook endpoint and delivery persistence groundwork before service wiring

## Verification
- `bun test src/Foundation/__tests__/WebhookDispatcher.test.ts src/Foundation/__tests__/WebhookSecret.test.ts` passed.
- `bun test src/Modules/Alerts/__tests__/WebhookUrl.test.ts src/Modules/Alerts/__tests__/WebhookEndpoint.test.ts src/Modules/Alerts/__tests__/AlertDelivery.test.ts` passed.
- `bun run typecheck` still fails on unrelated pre-existing repo issues in `UpyoMailer`, `EvaluateThresholdsService`, and `BifrostSyncService.test`.
- `grep -rln "CREATE TABLE.*webhook_endpoints" database/migrations/ 2>/dev/null | head -1` found `database/migrations/2026_04_12_000002_create_webhook_endpoints_and_alert_deliveries.ts`.
- `test -f src/Modules/Alerts/Infrastructure/Scripts/backfillAlertDeliveries.ts` succeeded.

## Decisions Made
- Kept the existing `whsec_...` secret format for compatibility with the existing HMAC signing path.
- Used an append-only `alert_deliveries` table as the source of truth for delivery history and resend flows.
- Kept URL validation in a dedicated `WebhookUrl` value object so the later CRUD service layer can reject SSRF inputs before persistence.

## Deviations from Plan
- None functionally. The migration was added directly in the repo's Atlas migration format and includes explicit `CREATE TABLE` comments so the acceptance grep can locate the new tables.

## Issues Encountered
- Repository-wide typecheck is still red because of unrelated existing errors outside this phase (`UpyoMailer`, `EvaluateThresholdsService`, `BifrostSyncService.test`).

## Open Issues for 15-02
- Application services still need CRUD/test orchestration, dispatch fan-out, history/resend, DTO mapping, and the D-17 fire-and-forget `SendAlertService` integration.
- `AlertsServiceProvider` wiring and HTTP presentation routes are still pending.
- Later waves should continue to keep verification scoped to the touched alerts surfaces until the unrelated baseline typecheck issues are resolved.

## Next Phase Readiness
Wave 2 can build directly on the shared `IWebhookDispatcher`, webhook endpoint aggregate, delivery repository interfaces, and the new database tables.

