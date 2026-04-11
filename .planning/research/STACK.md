# Technology Stack — v1.3 Alerts & Automated Reports

**Project:** Draupnir LLM Gateway
**Milestone:** v1.3 — Usage Alerts, Per-Key Cost Breakdown, Automated PDF Reports
**Researched:** 2026-04-12
**Confidence:** HIGH

## Executive Summary

v1.3 introduces three new capabilities requiring four stack additions:

1. **Email/Webhook notifications** — Send alerts when usage thresholds exceeded
2. **Server-side PDF generation** — Render dashboards as PDFs for email attachment
3. **Job scheduling** — Automate recurring report generation and dispatch
4. **Webhook persistence** — Track webhook delivery status and retry logic

All recommendations prioritize **Bun compatibility**, **TypeScript strictness**, and **integration with existing Drizzle ORM** infrastructure. No breaking changes to v1.0 and v1.2.

---

## Recommended Stack Additions

### Core Additions

#### 1. Email Sending — **Upyo v0.4.0** (Primary)

| Component | Selection | Version | Why |
|-----------|-----------|---------|-----|
| Email Framework | Upyo | 0.4.0 | Cross-runtime (Bun/Node/Deno/edge), zero deps, pluggable transports |
| SMTP Transport | Upyo SMTP | 0.4.0 | Local SMTP for dev, production SMTP server support |
| Service Provider | Resend | 6.10.0 | Modern cloud email, React Email components, 40MB attachments |

**Why Upyo over Nodemailer?**
- Nodemailer explicitly doesn't work on Bun/Deno (Node.js only)
- Upyo provides unified API across transports: SMTP, Resend, SendGrid, Mailgun
- Zero dependencies keeps bundle lean (critical for Bun startup time)
- Identical TypeScript API across all providers (swap at runtime via env var)

**Integration Pattern:**
```typescript
// Factory pattern: swap transport at startup via ServiceProvider
type EmailTransport = 'smtp' | 'resend'
const transport = process.env.EMAIL_TRANSPORT === 'resend'
  ? new ResendTransport({ apiKey: process.env.RESEND_API_KEY })
  : new SmtpTransport({ host, port, auth })

const result = await transport.send({ to, from, subject, html })
```

**High confidence:** Verified with official Bun email guide (2026), Upyo GitHub, and npm registry.

---

#### 2. Server-Side PDF Generation — **Playwright v1.59.1**

| Component | Selection | Version | Why |
|-----------|-----------|---------|-----|
| PDF Renderer | Playwright | 1.59.1 | Fastest (3ms warm), smallest files (59–125KB), multi-browser |
| Browser Engine | Chromium | Built-in | Pre-bundled, native CSS Grid/Flexbox support |
| Headless Mode | Chromium Headless | Native | No X11 dependency, light resource footprint |

**Why Playwright over Puppeteer/PDFKit?**
- **Performance:** 3ms warm start vs Puppeteer's 48ms (16x faster)
- **File size:** 59–125KB PDF vs Puppeteer's 197KB (40% smaller)
- **Compatibility:** Works seamlessly with Bun runtime (proven in production)
- **CSS support:** Full Flexbox/Grid rendering (needed for Recharts dashboard from v1.2)

**Benchmark Results (2026-04-02, macOS arm64):**
```
Cold start:  Playwright 42ms  vs  Puppeteer 147ms
Warm mode:   Playwright 3ms   vs  Puppeteer 48ms
File size:   Playwright 59KB  vs  Puppeteer 197KB
```

**Critical Bun Integration Note:**
Playwright's bundled Chromium may fail in Docker with Bun. Recommended workaround:
```bash
# Install system Chrome, point Playwright to it
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

**Memory & Resource Requirements:**
- Single render: ~200–500MB (depends on HTML complexity)
- Concurrent renders: Implement semaphore (queue up to 2–3 concurrent)
- Docker minimum: 2GB RAM allocated; shm size ≥ 1GB
- Disk: Ensure /tmp has free space ≥ RAM allocation

**High confidence:** PDF4.dev 2026 benchmark, Playwright docs, verified examples with Bun (Hono + Bun).

---

#### 3. Job Scheduling — **Bun.cron() Native API**

| Component | Selection | Version | Why |
|-----------|-----------|---------|-----|
| Scheduler | Bun.cron | Built-in | Native to Bun runtime, zero external deps |
| Cron Parser | Bun.cron | Built-in | Supports standard 5-field expressions + shortcuts |
| Fallback Queue | BullMQ | 5.73.4 | If Redis persistence needed in Phase 2 |

**Why Bun.cron over external schedulers (node-cron, Agenda)?**
- **Zero dependencies:** No external job queue infrastructure required
- **In-process execution:** Runs callbacks directly in Bun process
- **Cross-platform:** Works on macOS, Linux, Windows (with caveats)
- **Cron expressions:** Full support for `*/5 * * * *`, `@daily`, `@weekly`, ranges, lists

**Supported Cron Expressions:**
```
* * * * *        → Every minute
@hourly          → Every hour
@daily           → Every day at midnight (UTC)
@weekly          → Every Monday at midnight (UTC)
@monthly         → 1st of each month
30 2 * * MON     → 2:30 AM Mondays
0 0 1 * *        → 1st of each month at midnight
*/5 9-17 * * MON-FRI  → Every 5 min, 9 AM–5 PM weekdays
```

**Limitations & Workarounds:**
```
Windows Task Scheduler: Max 48 triggers per task
❌ Invalid: */7 * * * * (216 triggers)
✅ Valid:  */5 * * * * (288 triggers within Windows limits)

UTC-only: In-process cron always runs on UTC
Workaround: Calculate local time in handler, or use BullMQ for TZ-aware scheduling
```

**When to upgrade to BullMQ:**
- Need Redis persistence (cron survives restarts)
- Running load-balanced instances (multiple servers coordinate)
- Require retry logic with exponential backoff for failed jobs

**High confidence:** Bun.cron documented at bun.com/docs/runtime/cron, v1.3.12 release notes (March 2026).

---

#### 4. Job Queue & Scheduled Reports (Optional) — **BullMQ v5.73.4**

| Component | Selection | Version | Why |
|-----------|-----------|---------|-----|
| Job Queue | BullMQ | 5.73.4 | Redis-backed, full Bun support, rate limiting |
| Redis Client | ioredis | (via BullMQ) | Bun-compatible, handles connection pooling |
| Scheduler | BullMQ Job Factories | 5.73.4 | Cron-scheduled jobs with retry & rate limiting |

**When to use BullMQ:**
- Email delivery fails → auto-retry with exponential backoff
- High concurrent PDF renders → queue and rate-limit by tier
- Multi-instance deployment → Redis coordinates job locking

**Bun Setup Requirement:**
```typescript
const connection = {
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,  // Critical for Bun compatibility
}

const emailQueue = new Queue('send-email', { connection })
const emailWorker = new Worker('send-email', async (job) => {
  await sendEmail(job.data)
}, { connection })
```

**Defer to Phase 2 if:** Single-instance deployment, acceptable email failures, no retry budget.

**High confidence:** BullMQ explicitly supports Bun in CI, ElysiaJS + BullMQ + Bun examples from Feb 2026.

---

### Supporting Additions

#### Drizzle ORM Extensions (No New Dependency)

Use existing **Drizzle v0.45.1** (already in package.json) for webhook event storage:

```typescript
// src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts

export const webhookEvents = sqliteTable(
  'webhook_events',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),  // 'alert.threshold', 'report.generated'
    org_id: text('org_id').notNull(),
    payload: text('payload').notNull(),  // JSON stringified
    status: text('status').notNull().default('pending'),  // pending → sent → failed
    attempt_count: integer('attempt_count').default(0),
    last_error: text('last_error'),
    scheduled_at: text('scheduled_at'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_webhook_events_org_id').on(table.org_id),
    index('idx_webhook_events_status').on(table.status),
    index('idx_webhook_events_scheduled_at').on(table.scheduled_at),
  ],
)
```

No ORM API changes needed; use existing Drizzle query builder from `src/Shared/Infrastructure/Database/Adapters/Drizzle`.

---

## Installation Instructions

```bash
# Core additions
bun add @upyo/core @upyo/resend
bun add -d playwright

# Optional: Distributed job queue (Phase 2)
# bun add bullmq ioredis

# Create schema migration for webhook_events
bun run make:migration add_webhook_events_table
```

### Environment Variables

```env
# Email transport (dev uses SMTP, prod uses Resend)
EMAIL_TRANSPORT=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test
SMTP_PASS=test

# Production: Resend API (when EMAIL_TRANSPORT=resend)
RESEND_API_KEY=re_xxxxx

# Webhook scheduling
ALERT_CHECK_SCHEDULE=*/5 * * * *     # Every 5 minutes
REPORT_GENERATION_SCHEDULE=0 2 * * MON  # Mondays 2 AM UTC

# PDF rendering (Docker only)
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

---

## Alternatives Considered & Rejected

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Email | Upyo | Nodemailer | Doesn't work on Bun; Node.js-only |
| Email | Upyo | Postal/Brevo | Higher complexity, no native Bun support, HTTP-only |
| PDF | Playwright | Puppeteer | 16x slower warm start (48ms vs 3ms), 40% larger files |
| PDF | Playwright | html2pdf/WeasyPrint | Python-based, incompatible with Bun runtime |
| PDF | Playwright | PDFKit | Programmatic PDF only, can't render complex CSS/charts |
| Scheduler | Bun.cron | Node-cron | External dep, less performant on Bun, no native support |
| Scheduler | Bun.cron | Agenda | MongoDB dependency overkill for v1.3 |
| Queue | BullMQ | Bull (legacy) | Deprecation risk; BullMQ is maintained successor |
| Queue | BullMQ | Bee-queue | Lighter but no scheduled job factories for Bun |
| Notifications | Native Bun.cron | Svix | Overkill for Phase 1; consider for Phase 3 if 3rd-party webhooks critical |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| SendGrid directly | Resend/Upyo abstraction already handles it; adds direct SDK overhead | Upyo + RESEND_API_KEY config |
| Mailgun directly | Same as SendGrid | Upyo + mailgun transport in Phase 2 |
| Apache Kafka / RabbitMQ | Overkill for single-instance; Redis via BullMQ is sufficient | BullMQ (Phase 2) if scaling required |
| Scheduled.io / Temporal | Heavy orchestration for simple cron jobs | Bun.cron (v1.3) or BullMQ (v1.3.1) |

---

## Integration Checklist

### Phase 1: Core Features (v1.3)
- [ ] Create `AlertService` using Upyo for SMTP/Resend
- [ ] Implement `PdfReportService` using Playwright
- [ ] Add Drizzle migration for `webhook_events` table
- [ ] Create `AlertScheduler` using Bun.cron
- [ ] Add environment variable validation (zod schemas)
- [ ] Unit test email sending with Upyo mocks
- [ ] Integration test PDF rendering with sample HTML from Recharts
- [ ] E2E test: Verify alert fires when threshold exceeded
- [ ] E2E test: Verify PDF email generated and sent

### Phase 2: Reliability (v1.3.1)
- [ ] Set up Redis locally + BullMQ queue
- [ ] Implement retry logic with exponential backoff
- [ ] Add webhook delivery tracking to `webhook_events`
- [ ] Create webhook status dashboard
- [ ] Load test Playwright with concurrent renders (5+ concurrent)
- [ ] Set up monitoring for email delivery success rate

### Deployment Checklist
- [ ] Docker: Install `chromium-browser` or use `microsoft/playwright-for-docker` base image
- [ ] Docker: Allocate ≥2GB RAM, set `--ipc=host` for Chromium shared memory
- [ ] Production: Set `EMAIL_TRANSPORT=resend` + valid RESEND_API_KEY
- [ ] Production: Configure `ALERT_CHECK_SCHEDULE` per SLA requirements (recommend `*/5 * * * *`)
- [ ] Production: Configure `REPORT_GENERATION_SCHEDULE` per business requirements (recommend `0 2 * * MON`)
- [ ] Monitor: Track email delivery success rate (target ≥99%)
- [ ] Monitor: Track PDF generation latency (target <5s per report)
- [ ] Alerting: Meta-alert if alerts fail to send (alert on alert delivery)

---

## Versions Verified

| Library | Version | Last Updated | Bun Compatible | Verified By |
|---------|---------|--------------|----------------|------------|
| @upyo/core | 0.4.0 | 2026-04-09 | ✅ YES | GitHub + npm registry |
| @upyo/resend | 0.4.0 | 2026-04-09 | ✅ YES | Built on Upyo core |
| Playwright | 1.59.1 | 2026-04-02 | ✅ YES | PDF4.dev benchmark, examples |
| BullMQ | 5.73.4 | 2026-04-11 | ✅ YES | TestSuite runs on BunJS in CI |
| Bun.cron | Built-in | v1.3.12+ | ✅ YES | bun.com/docs/runtime/cron |
| Drizzle ORM | 0.45.1 (existing) | 2026-03-15 | ✅ YES | Already in project |

---

## Risk Mitigation

### Email Delivery Failures
**Risk:** SMTP outages or misconfiguration prevent alerts  
**Mitigation:**
- Use Resend (managed service) in production, not self-hosted SMTP
- Implement retry with exponential backoff (via BullMQ in Phase 2)
- Alert on alert delivery failures (meta-monitoring)

### PDF Memory Exhaustion
**Risk:** Concurrent PDF renders OOM the process  
**Mitigation:**
- Implement semaphore: max 2–3 concurrent Playwright instances
- Kill hung renders after 30s timeout
- Monitor heap usage; alert if >1.5GB

### Cron Timezone Issues
**Risk:** Bun.cron runs UTC; users expect local time  
**Mitigation:**
- Document all schedules as UTC in UI
- Calculate user timezone offset in AlertService handler
- Use BullMQ in Phase 2 if TZ-aware scheduling becomes critical

### Webhook Signature Verification (Future)
**Risk:** Third-party webhook receivers don't validate origin  
**Consideration:**
- Add HMAC-SHA256 signature to webhook payload (Phase 2)
- Document verification in webhook receiver guide
- Consider Svix-like pattern if webhook delivery becomes critical (Phase 3)

---

## Sources

### Email Libraries
- [Upyo GitHub](https://github.com/dahlia/upyo)
- [Upyo npm @upyo/core](https://www.npmjs.com/package/@upyo/core)
- [Bun Email Sending Guide (2026)](https://dev.to/hongminhee/sending-emails-in-nodejs-deno-and-bun-in-2026-a-practical-guide-og9)
- [Resend Bun Documentation](https://resend.com/docs/send-with-bun)
- [Resend npm](https://www.npmjs.com/package/resend)

### PDF Generation
- [Playwright HTML to PDF Benchmark 2026](https://pdf4.dev/blog/html-to-pdf-benchmark-2026)
- [Playwright Official Docs](https://playwright.dev/docs/intro)
- [Playwright npm](https://www.npmjs.com/package/playwright)
- [Bun + Hono + Playwright Document Generation API](https://dev.to/zerolooplabs/how-i-built-a-document-generation-api-with-bun-hono-playwright-do0)
- [Playwright Docker Production Guide](https://thomasbourimech.com/blog/en/playwright-chromium-docker-production/)

### Job Scheduling
- [Bun.cron Official Documentation](https://bun.com/docs/runtime/cron)
- [Bun v1.3.12 Release Notes](https://bun.com/blog/bun-v1.3.12)
- [BullMQ Official Docs](https://docs.bullmq.io/)
- [BullMQ GitHub](https://github.com/taskforcesh/bullmq)
- [BullMQ npm](https://www.npmjs.com/package/bullmq)
- [BullMQ + Bun Examples](https://dev.to/anupom69/scheduling-whatsapp-messages-with-bun-bullmq-3il2)

### Drizzle ORM
- [Drizzle ORM Official](https://orm.drizzle.team/)
- [Drizzle Bun SQLite Integration](https://orm.drizzle.team/docs/connect-bun-sqlite)
- [Drizzle npm](https://www.npmjs.com/package/drizzle-orm)

---

**Status:** Ready for roadmap implementation. All versions verified current (2026-04-12), Bun compatibility confirmed, integration points mapped to existing DDD architecture (Foundation/Modules pattern).

**Confidence Assessment:**
| Area | Confidence | Notes |
|------|------------|-------|
| Email stack (Upyo) | HIGH | Official docs, cross-runtime verified |
| PDF generation (Playwright) | HIGH | Benchmark verified, examples in production |
| Job scheduling (Bun.cron) | HIGH | Built-in, documented, v1.3.12+ |
| Queue fallback (BullMQ) | HIGH | Explicit Bun support in CI |
| Database (Drizzle) | HIGH | Already in project, no changes needed |
