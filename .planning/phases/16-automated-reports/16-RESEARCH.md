# Phase 16: Automated Reports - Research

**Researched:** 2026-04-12
**Domain:** Automated Reporting — PDF generation, scheduled tasks, timezone-aware cron, email attachments
**Confidence:** HIGH

## Summary

Phase 16 implements automated weekly and monthly PDF usage reports. This phase leverages the existing email infrastructure (Phase 13) and cost aggregation logic (Phase 14) to provide proactive insights directly to admin inboxes.

The technical core consists of three parts: (1) a **Timezone-aware Scheduler** using `croner` to handle diverse admin locations and DST transitions, (2) a **Server-side PDF Generator** using `Playwright (Chromium)` to render existing Recharts components into high-quality PDFs, and (3) an **Email Dispatcher** that attaches the generated PDFs using the `IMailer` port.

**Primary recommendation:** Use `croner` for scheduling (zero-dependency, Bun-native, IANA timezone support) and `Playwright` for PDF generation (most reliable for SVG charts). Security for headless browser access should use signed "One-Time-Token" URLs for report routes.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| croner | 9.0.0 | Scheduling with timezones | Zero-dependency, Bun compatible, handles IANA timezones and DST transitions accurately. |
| playwright | 1.59.1 | Headless browser PDF generation | Standard for rendering SVG charts (Recharts) to PDF; Chromium print engine is the most stable PDF generator. |
| luxon | 3.5.0 | Timezone and interval manipulation | Prompt suggestion; industry standard for complex date/time math in reports. |
| @upyo/core | 0.4.0 | Email abstraction | Verified in Phase 13; handles attachments and multi-runtime support. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @upyo/smtp | 0.4.0 | SMTP transport | Local development and production SMTP delivery. |
| zod | 4.3.6 | Input validation | Validating report schedule configurations. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bun.cron() | croner | `Bun.cron()` (native) is UTC-only for in-process tasks; `croner` supports IANA timezones natively. |
| Puppeteer | Playwright | Playwright has better performance (cold start) and more reliable "print-to-pdf" features in 2026. |
| react-pdf | Playwright | `react-pdf` cannot render Recharts (SVG) without complex manual conversions to PNG or specialized SVG paths. |
| node-cron | croner | `croner` is lighter and has better Bun/ESM compatibility. |

**Installation:**
```bash
bun add croner playwright luxon
npx playwright install chromium
```

**Version verification:** Versions confirmed via `npm view` on 2026-04-12.

## Architecture Patterns

### Recommended Project Structure
```
src/Modules/Reports/
├── Domain/
│   ├── Aggregates/
│   │   └── ReportSchedule.ts      # Frequency, Day, Time, Timezone, Recipients
│   ├── ValueObjects/
│   │   ├── CronExpression.ts       # Parses/validates schedule
│   │   └── ReportToken.ts          # HMAC-signed token for headless auth
│   └── Repositories/
│       └── IReportScheduleRepository.ts
├── Application/
│   ├── Services/
│   │   ├── ReportSchedulerService.ts # Manages croner jobs on startup/edit
│   │   ├── ReportGeneratorService.ts # Triggers Playwright to render PDF
│   │   └── SendReportService.ts      # Composes email + attaches PDF
│   └── DTOs/
│       └── ReportDTO.ts
├── Infrastructure/
│   ├── Repositories/
│   │   └── DrizzleReportScheduleRepository.ts
│   ├── Services/
│   │   └── PlaywrightPdfGenerator.ts # Implementation of PDF generation
│   └── Providers/
│       └── ReportsServiceProvider.ts
└── Presentation/
    ├── Controllers/
    │   └── ReportController.ts
    ├── Routes/
    │   └── report.routes.ts         # Routes for configuration UI
    └── Pages/
        └── ReportTemplatePage.tsx   # Special Inertia route for PDF rendering
```

### Pattern 1: Timezone-Aware Scheduling (Croner)
**What:** Use `croner` to register jobs with explicit IANA timezones.
**When to use:** All scheduled reports.
**Example:**
```typescript
import { Cron } from 'croner';

// Run every Monday at 9:00 AM in the user's specific timezone
const job = new Cron('0 9 * * 1', { 
  timezone: 'America/New_York',
  name: `report-${scheduleId}` 
}, async () => {
  await reportGenerator.generateAndSend(scheduleId);
});
```

### Pattern 2: Signed Report Tokens (Headless Auth)
**What:** Headless browsers can't easily handle login forms. Use a signed URL with an HMAC token.
**Why:** Securely allows Playwright to access a dedicated report rendering route without a session cookie.
**Example:**
```typescript
// /internal/reports/usage/:orgId?token=SIGNATURE&start=...&end=...
const token = ReportToken.sign(orgId, expiresAt, secret);
const url = `${baseUrl}/internal/reports/usage/${orgId}?token=${token}...`;
await page.goto(url);
```

### Pattern 3: Playwright PDF Generation
**What:** Use Playwright to capture the PDF. Ensure animations are disabled in Recharts.
**Example:**
```typescript
// Source: Playwright 1.x / Chromium Print-to-PDF
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(reportUrl, { waitUntil: 'networkidle' });

// Essential: Recharts animations must be off for the PDF to be ready immediately
const pdfBuffer = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: { top: '20px', bottom: '20px' }
});
await browser.close();
```

### Anti-Patterns to Avoid
- **Hard-coding UTC:** Users expect reports at 9:00 AM *their* time, not UTC.
- **Rendering charts via JSDOM:** Recharts needs real browser layout calculations to render SVGs correctly.
- **Using `Bun.cron` for per-user schedules:** `Bun.cron` is great for system tasks (UTC), but `croner` is superior for user-defined local time schedules.
- **Keeping browser instances open indefinitely:** Launch and close, or use a managed pool. Leaving headless browsers open leaks memory.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron Parsing | Custom regex parser | croner | Handles complex patterns (L, W, #) and timezones perfectly. |
| PDF Layout | Custom PDF drawing (pdf-lib) | Playwright | Reuse existing React/Inertia components; layout is identical to dashboard. |
| Timezone DST | Custom offset logic | Luxon / Croner | DST transitions are irregular and vary by region; built-in IANA support is mandatory. |
| Email Attachments | Custom MIME builder | @upyo/core | Verified SMTP compliance and cross-runtime support. |

**Key insight:** The existing dashboard components can be reused for the PDF by creating a "printer-friendly" Inertia route. This saves hundreds of hours of manual PDF layout work.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `report_schedules` table | New table required to store configurations. |
| Live service config | None | All scheduling is in-process via `croner`. |
| OS-registered state | None | Not using OS-level `Bun.cron` to avoid setup complexity. |
| Secrets/env vars | `REPORT_SIGNING_SECRET` | Required for signing report tokens. |
| Build artifacts | Playwright Chromium | `npx playwright install chromium` required in CI/CD. |

## Common Pitfalls

### Pitfall 1: Recharts Animations
**What goes wrong:** PDF shows empty charts or charts mid-animation.
**Why it happens:** Playwright takes the PDF "snapshot" before the 500ms CSS/SVG animation completes.
**How to avoid:** Always pass `isAnimationActive={false}` to Recharts components when in "report mode."

### Pitfall 2: Memory Leaks in Headless Browsers
**What goes wrong:** Server runs out of RAM after 50 reports.
**Why it happens:** Browser instances or pages are not closed in a `finally` block after a crash.
**How to avoid:** Wrap Playwright logic in `try-finally` and ensure `browser.close()` is called.

### Pitfall 3: Timezone Selection (IANA vs Offsets)
**What goes wrong:** User selects "UTC+8", but when DST hits, the report is an hour late.
**Why it happens:** Offsets are static; timezones (IANA) are dynamic.
**How to avoid:** Always store IANA strings (e.g., `Asia/Taipei`) rather than fixed offsets.

### Pitfall 4: Missing System Fonts
**What goes wrong:** PDF shows "boxes" instead of Chinese characters.
**Why it happens:** Headless Chromium on Linux servers often lacks CJK fonts.
**How to avoid:** Ensure `fonts-noto-cjk` or similar is installed on the production server.

## Code Examples

### Report Schedule Aggregate
```typescript
// src/Modules/Reports/Domain/Aggregates/ReportSchedule.ts
export class ReportSchedule {
  constructor(private readonly props: {
    id: string;
    orgId: string;
    type: 'weekly' | 'monthly';
    day: number; // 0-6 for weekly, 1-31 for monthly
    time: string; // "09:00"
    timezone: string; // "Asia/Taipei"
    recipients: string[];
    enabled: boolean;
  }) {}

  get cronExpression(): string {
    const [hour, minute] = this.props.time.split(':');
    if (this.props.type === 'weekly') {
      return `${minute} ${hour} * * ${this.props.day}`;
    }
    return `${minute} ${hour} ${this.props.day} * *`;
  }
}
```

### Signed Token Verification
```typescript
// src/Modules/Reports/Domain/ValueObjects/ReportToken.ts
import { createHmac } from 'node:crypto';

export class ReportToken {
  static sign(orgId: string, expiresAt: number, secret: string): string {
    const payload = `${orgId}:${expiresAt}`;
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return `${payload}:${hmac.digest('hex')}`;
  }

  static verify(token: string, secret: string): string | null {
    const [orgId, expiresAt, signature] = token.split(':');
    const expected = this.sign(orgId, Number(expiresAt), secret).split(':')[2];
    if (signature !== expected || Date.now() > Number(expiresAt)) return null;
    return orgId;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom PDF libraries | Headless Browser (Playwright) | 2024-2025 | 100% CSS/React fidelity; reuse existing UI code. |
| node-cron | croner | 2025 | Native Bun support, better timezone handling, zero deps. |
| Static report routes | Signed URL Auth | 2026 | Eliminates cookie-sync issues in headless browsers. |

## Open Questions

1. **Browser Management Strategy**
   - What we know: Launching a new browser per report is safe but slow.
   - What's unclear: Whether a single persistent browser with multiple contexts is stable enough for high-volume concurrent reports.
   - Recommendation: Start with launch/close per report for v1.3. Optimize with a pool only if performance becomes a bottleneck.

2. **Wait for Network Idle**
   - What we know: Recharts needs data to render.
   - What's unclear: Whether `networkidle` is enough, or if we need a "Report Ready" DOM event.
   - Recommendation: Use `networkidle` + `isAnimationActive={false}`. If issues persist, add a small `setTimeout` buffer.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Runtime | ✓ | 1.3.10 | — |
| Playwright | PDF Gen | ✓ | 1.59.1 | — |
| Chromium | Playwright | ✗ | — | `npx playwright install chromium` |

**Missing dependencies with no fallback:**
- Chromium (Must be installed during setup task)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `bun test src/Modules/Reports` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REPT-01 | Weekly/Monthly cron string generation | unit | `bun test src/Modules/Reports/__tests__/ReportSchedule.test.ts` | ❌ Wave 0 |
| REPT-04 | Timezone/DST handling in scheduling | unit | `bun test src/Modules/Reports/__tests__/CronerTimezone.test.ts` | ❌ Wave 0 |
| REPT-02 | PDF buffer generation from HTML | integration | `bun test src/Modules/Reports/__tests__/PdfGenerator.integration.test.ts` | ❌ Wave 0 |
| REPT-03 | Email dispatch with attachment | integration | `bun test src/Modules/Reports/__tests__/ReportDispatch.integration.test.ts` | ❌ Wave 0 |

## Sources

### Primary (HIGH confidence)
- Bun documentation for `Bun.cron` vs Library support.
- Playwright official documentation (Chromium PDF API).
- croner documentation (IANA timezone support).
- npm registry: croner@9.0.0, playwright@1.59.1, luxon@3.5.0.

### Secondary (MEDIUM confidence)
- Phase 13 Research (Email Infrastructure).
- Phase 14 Research (Cost Data Aggregation).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH
- Architecture: HIGH
- Pitfalls: HIGH

**Research date:** 2026-04-12
**Valid until:** 2026-05-12
