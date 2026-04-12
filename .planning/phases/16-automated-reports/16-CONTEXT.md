# Phase 16: Automated Reports - Context

## Requirement Summary
Admins receive scheduled PDF usage reports via email. This allows proactive cost monitoring without manual dashboard visits.

## User Decisions
- **D-01 (Playwright)**: Use Playwright (Chromium) for server-side PDF generation. This is preferred over Puppeteer for performance and stability.
- **D-02 (Croner)**: Use `croner` for scheduling instead of `Bun.cron()` to support IANA timezones and DST transitions.
- **D-03 (Signed Tokens)**: Use HMAC-signed one-time-tokens for headless browser authentication on report routes.
- **D-04 (Recharts Animations)**: Disable Recharts animations (`isAnimationActive={false}`) for PDF rendering to ensure charts are fully rendered before capture.
- **D-05 (Email Infrastructure)**: Reuse the Phase 13 `IMailer` port and `@upyo/core` infrastructure for sending reports as attachments.

## Implementation Strategy

### Plan 16-01: Backend Foundation
- **ReportJob Aggregate**: Domain model for report configuration (frequency, timezone, recipients).
- **IReportRepository**: Persistence interface for report schedules.
- **GeneratePdfService**: Uses Playwright to render a dedicated Inertia route into a PDF buffer.
- **ScheduleReportService**: Wraps `croner` to manage active report jobs in-memory.
- **SendReportEmailService**: Composes the email with the PDF attachment using Phase 13 `IMailer`.
- **ReportController**: Admin-facing API for report configuration CRUD.
- **Migrations**: Database schema for `report_jobs` (or `report_schedules`).

### Plan 16-02: Frontend Management
- **ReportsPage**: Inertia page at `/admin/reports` for managing schedules.
- **Report Form**: Support weekly/monthly selection, day/time selection, and IANA timezone picker (using `luxon`).
- **ReportPreview**: A visual preview of the report template using the same components as the PDF generator.
- **Timezone Picker**: Ensure accurate timezone selection to prevent scheduling errors.

## Constraints
- Follow Phase 15 patterns (Inertia, DDD, TDD).
- Ensure all cost calculations use `Decimal.js` (standardized in v1.3).
- PDF generation must handle CJK fonts if required (system fonts check).
- Memory management: Ensure browser instances are closed after PDF generation.

## Deferred Ideas
- **Managed Browser Pool**: Starting with launch/close per report for simplicity. Pool deferred to v2 if performance requires it.
- **Custom PDF Layouts**: Reuse existing React components via Playwright; custom PDF drawing deferred.
