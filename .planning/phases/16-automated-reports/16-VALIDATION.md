# Phase 16: Automated Reports - Validation

## Goal
Admins receive scheduled PDF usage reports via email. Reports are accurate, timely, and respect the admin's timezone.

## Observable Truths
- [ ] Admin can create a weekly report schedule for Monday at 9:00 AM in "Asia/Taipei".
- [ ] Admin can create a monthly report schedule for the 1st of each month at 8:00 AM in "America/New_York".
- [ ] System automatically triggers report generation at the scheduled time.
- [ ] Generated PDF contains correct cost data and charts matching the dashboard.
- [ ] Admin receives an email with the PDF attached at the correct time.
- [ ] Report generation handles daylight saving transitions correctly.

## Automated Tests

### Unit Tests
- `ReportSchedule`: Verify cron expression generation for weekly/monthly frequencies.
- `ReportToken`: Verify HMAC signature and expiration logic.
- `CronerTimezone`: Verify that `croner` correctly handles different timezones and DST transitions.

### Integration Tests
- `PdfGenerator`: Verify that Playwright can successfully render a report page and produce a PDF buffer.
- `SendReportService`: Verify that an email with a buffer attachment is correctly passed to the mailer.
- `ReportRepository`: Verify CRUD operations for `ReportSchedule`.

### End-to-End Tests
- Create a schedule via the API/UI.
- Manually trigger the scheduled job (or wait/simulate time).
- Verify email delivery (using a mail trap or console logger).

## Key Links
- **Croner -> ReportGenerator**: Ensuring the scheduler correctly triggers the generator.
- **Playwright -> Inertia Route**: Ensuring the headless browser can access the report template.
- **ReportGenerator -> IMailer**: Ensuring the PDF buffer is correctly attached and sent.
- **Decimal.js Usage**: All cost values in the report must match the high-precision calculations in the DB.

## Manual Verification
1. Visit `/admin/reports` and create a schedule for 2 minutes from now.
2. Monitor server logs for PDF generation activity.
3. Check the configured email inbox for the report.
4. Open the PDF and verify charts are rendered (no animations, no missing data).
