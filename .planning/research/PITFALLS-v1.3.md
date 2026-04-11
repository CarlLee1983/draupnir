# Domain Pitfalls: v1.3 Advanced Analytics & Alerts

**Domain:** LLM Gateway Analytics with Usage Alerts, Cost Breakdown, and Automated Reports  
**Researched:** 2026-04-12  
**Project Context:** Adding webhook/email alerts, per-key cost tracking, and auto-scheduled PDF reports to existing Bun + TypeScript + DDD analytics system

---

## Critical Pitfalls

These mistakes cause system failures, rewrites, or loss of user trust. Require prevention at architecture phase.

### Pitfall 1: Alert Fatigue Through Unconstrained Multi-Channel Dispatch

**What goes wrong:**
- Single threshold breach triggers alerts across email + webhook + in-app notification simultaneously
- With no aggregation logic, a cost spike creates 3+ duplicate notifications to same recipient
- Users stop checking alerts entirely after 1-2 weeks of noise
- Support team drowns in "why am I getting so many emails?" complaints

**Why it happens:**
- Treating alert delivery as a simple one-to-one mapping (event → 3 channels)
- No deduplication window (e.g., "don't send another email for 1 hour if already sent")
- No alert grouping (e.g., "batch 5 threshold breaches into 1 daily digest")
- Assuming users want real-time notifications on every single threshold type

**Consequences:**
- Complete loss of signal value; alerts become noise
- Users disable notifications system-wide (defeating the entire v1.3 feature)
- Alert configuration becomes ignored by users ("just use defaults")
- High churn on usage-alert feature adoption

**Prevention:**
1. **Design alert severity levels** (CRITICAL, WARNING, INFO) with per-level dispatch rules:
   - CRITICAL only → email + webhook, re-send if not acknowledged in 24h
   - WARNING → webhook only, batch up to 10 per 1h window
   - INFO → in-app only, no email/webhook

2. **Implement deduplication window**: Track last alert sent for each (user, threshold_type, severity). Don't send again within 1 hour unless severity escalates.

3. **Add "digest mode" option** in user preferences:
   - Real-time (default for first week, then switch to digest)
   - Daily digest (batch all alerts, send at 9 AM user timezone)
   - Weekly digest (batch threshold breaches for last 7 days)

4. **Build alert grouping logic**: If cost threshold + token threshold both breach within 1 hour, send ONE email with both events, not two.

5. **Set hard limit**: Max 1 email per user per day by default. Make this configurable per org but with warnings at 5+ emails/day.

6. **Monitor alert fatigue metrics**: Track how many alerts closed without action, alert disable rate, and email open rates. Alert diminishes value if open rate drops below 30%.

**Detection:**
- Email open rate drops below 30% after 2 weeks
- Users manually disable notifications or create email filters
- Support tickets about "too many emails"
- Webhook retry failures due to rate limiting

**Phase to Address:** Phase 1 (Alert System) — design severity + dedup before first deployment

---

### Pitfall 2: Email Deliverability Collapse Under Authentication & ISP Strictness

**What goes wrong:**
- Transaction alerts sent successfully from your server
- Recipients never receive them (no bounce, no error, they go to spam)
- System appears functional; alerts quietly fail for 30% of users
- Discovered only when user complains they missed a budget alert and overspent

**Why it happens:**
- SPF/DKIM records exist but not aligned correctly (domain misalignment)
- Sending transactional email from shared/generic "noreply@" address without reputation
- DNS records updated but 24-48h TTL cache not cleared
- Using same email infrastructure for marketing + transactional (ISPs penalize this heavily in 2026)
- Insufficient mail header authentication (missing DMARC, weak DKIM signing)
- High email send volume without rate limiting causes ISPs to filter

**Consequences:**
- Alerts silently fail (highest severity): users don't know they're over budget
- False confidence: system logs show successful send; admin dashboards show no errors
- Revenue impact: users exceed budget limits and dispute charges
- Reputation damage: ISPs block future sends from your domain
- Dead alerts feature: product becomes unusable

**Prevention:**

1. **Separate email infrastructure**: Use a dedicated transactional email service (SendGrid, Postmark, Mailgun) with its own sending domain:
   ```
   noreply@alerts.draupnir.example.com (transactional only)
   marketing@draupnir.example.com (marketing only, separate domain)
   ```

2. **Full authentication stack**:
   - SPF: `v=spf1 include:sendgrid.net ~all` (verify with ISP)
   - DKIM: 2048-bit key, signed for all transactional headers
   - DMARC: `p=reject` after 30 days warmup (strict policy)
   - Domain alignment: Reply-To and From must match SPF/DKIM domain

3. **Implement sending rate limits**: No more than 10 emails/second per sending domain. Queue excess with backoff.

4. **Warm up sending reputation**: Start with 100 emails/day, double every 3 days for 30 days. Don't go from 0 → 10K emails/day in one hour.

5. **Dedicated delivery provider SDK**: Don't implement SMTP yourself. Use official SDK (e.g., SendGrid Node.js lib) with built-in retry, tracking, bounce handling.

6. **Test deliverability before launch**: Send 100 test emails to mailbox providers (Gmail, Outlook, Yahoo, corporate) and verify inbox placement. Use Mailtrap or similar for staging validation.

7. **Implement bounce handling**: Capture hard bounces (invalid email), soft bounces (mailbox full), and complaints (spam reports). Disable alerts for bounced addresses automatically.

8. **Monitor delivery metrics**:
   - Bounce rate < 1%
   - Spam complaint rate < 0.1%
   - Unsubscribe rate < 0.5%
   - Deliver every alert at least twice with 30-min retry if first fails

**Detection:**
- Error logs show 200 OK from SendGrid but user doesn't receive email
- ISP feedback loops report spam complaints
- User reports: "I never got the alert"
- Bounce/complaint rates exceed 2% in first month
- Email open rate is 0% for specific ISP domains (indicator of spam folder)

**Phase to Address:** Phase 1 (Alert System) — setup before first email sent, test in staging with real mailbox providers

---

### Pitfall 3: Server-Side PDF Generation Crashes Under Load

**What goes wrong:**
- First 10 scheduled reports generate PDFs fine
- 11th concurrent report request causes server out-of-memory crash
- User gets no report; logs show "FATAL: JavaScript heap out of memory"
- Service down for 5+ minutes; scheduled reports for 100 organizations missed

**Why it happens:**
- Launching a new Puppeteer browser instance for each report (1 instance = 100-500MB RAM)
- 10 concurrent report requests = 1-5GB RAM spike
- No browser instance pooling or reuse
- PDF library (pdfkit, html2pdf) loading entire HTML page into memory before rendering
- No timeout; if HTML rendering stalls, process hangs and leaks memory
- Testing with single report; production has 50+ concurrent requests at month-end

**Consequences:**
- Service unavailable during high-load periods (month-end, quarterly reviews)
- Lost revenue: users don't receive reports, miss insights, renewals at risk
- Customer support escalation: "Our reports disappeared"
- Deployment rollback, urgent hotfix required

**Prevention:**

1. **Browser instance pooling**: Create fixed pool of 3-5 Puppeteer instances at startup, reuse them:
   ```typescript
   // Pseudocode
   const browserPool = [];
   for (let i = 0; i < 5; i++) {
     browserPool.push(await puppeteer.launch());
   }
   
   async function generateReport(html: string): Promise<Buffer> {
     const browser = await acquireFromPool(browserPool); // Wait if pool empty
     try {
       const page = await browser.newPage();
       await page.setContent(html);
       return await page.pdf();
     } finally {
       releaseToPool(browserPool, browser);
     }
   }
   ```

2. **Hard timeout per report**: Fail fast if PDF generation exceeds 30 seconds:
   ```typescript
   const timeoutPromise = new Promise((_, reject) =>
     setTimeout(() => reject(new Error('PDF timeout')), 30000)
   );
   
   await Promise.race([generatePdfPromise, timeoutPromise]);
   ```

3. **Memory limits and monitoring**:
   - Set Node/Bun process memory limit: `--max-old-space-size=2048` (2GB)
   - Alert if memory usage exceeds 80% (1.6GB)
   - Gracefully reject new report requests if memory > 90%

4. **Queue-based scheduling**: Don't process all concurrent report requests at once. Use job queue (Bull, RabbitMQ):
   - Max 2 concurrent PDFs, queue rest with 5-min timeout
   - Prevents thundering herd at month-end

5. **Lightweight PDF generation for scheduled reports**: Consider HTML-to-PDF service (e.g., WeasyPrint API, ChromeHTML2PDF SaaS) for baseline tier:
   - Offloads memory pressure
   - Paid service handles scaling
   - Keep Puppeteer for advanced use cases only

6. **Test with realistic load**: Simulate 10-20 concurrent report requests in staging. Monitor memory during test.

7. **Implement circuit breaker**: If PDF generation fails 3x in a row, stop accepting new requests for 10 minutes. Return user-friendly error instead of crash.

**Detection:**
- OOM errors in production logs during scheduled report time
- Process restarts/crashes during month-end
- Users report missing reports with no error in their inbox
- Memory usage creeps up and never drops (indicates leak)

**Phase to Address:** Phase 2 (Automated Reports) — architect pooling before implementing report scheduler

---

### Pitfall 4: Timezone & Daylight Saving Time Breaks Scheduled Reports

**What goes wrong:**
- Monthly report scheduled for "1st of month at 9 AM user timezone"
- During daylight saving time transition (spring forward), report fires at 1 AM local time instead
- Or fires twice (fall back), or skips entire day
- Users get confused; reports appear out-of-sync with their expectations

**Why it happens:**
- Cron library doesn't natively handle DST transitions
- Storing schedules as fixed UTC time without timezone metadata
- Assuming server timezone = user timezone
- Testing only in UTC; no DST transitions in test period
- Using `node-cron` without timezone-aware wrapper

**Consequences:**
- Reports sent at wrong time (missing the intended 9 AM slot)
- Users miss reports because they arrive at 1 AM instead of 9 AM
- Confusion about "why did I get two reports?"
- Loss of trust in scheduled report reliability

**Prevention:**

1. **Use timezone-aware cron library**: Replace `node-cron` with `croner` (supports Bun, Node.js):
   ```typescript
   import { Cron } from 'croner';
   
   const job = new Cron('0 9 1 * *', {
     timezone: 'America/New_York' // User's timezone, not UTC
   }, () => {
     generateAndSendReport();
   });
   ```

2. **Store schedules with timezone**: In database, store:
   - user_id
   - schedule_cron: "0 9 1 * *" (day of month, 9 AM local)
   - timezone: "America/New_York" (user's preferred timezone)
   - Never store as UTC offset; DST breaks offset-based storage

3. **Avoid scheduling during DST transition windows**: Warn users if they schedule a report during 1-3 AM on 2nd Sunday of March or 1st Sunday of November (DST dates in US):
   ```typescript
   if (hour >= 1 && hour <= 3 && isDSTTransitionDate(date)) {
     throw new Error('Cannot schedule reports between 1-3 AM on DST transition dates');
   }
   ```

4. **Test with DST dates**: Add test cases that simulate DST transitions:
   ```typescript
   // March 12, 2023, 2 AM → 3 AM (spring forward)
   // November 5, 2023, 2 AM → 1 AM (fall back)
   ```

5. **Allow timezone selection in UI**: Don't assume user timezone from browser. Let them explicitly choose:
   ```typescript
   <select name="timezone">
     <option value="UTC">UTC (Coordinated Universal Time)</option>
     <option value="America/New_York">Eastern Time</option>
     <option value="Europe/London">London Time</option>
   </select>
   ```

6. **Log cron execution with timezone context**: When report fires, log:
   ```
   Report scheduled for 2026-05-01 09:00:00 America/New_York
   Report fired at 2026-05-01 09:00:23 America/New_York
   ```

**Detection:**
- Reports fire at 1 AM local time during DST transition
- Users report receiving duplicate reports
- Cron job execution times don't match configured times

**Phase to Address:** Phase 2 (Automated Reports) — implement timezone before first scheduler deployment

---

### Pitfall 5: Cost Calculation Precision Loss in Currency Conversions

**What goes wrong:**
- Cost tracked as `0.001234` USD per token
- Multiplied by token count: `1500 tokens * 0.001234 = 1.851` USD
- Stored in database as Float: `1.8510000000000002` (floating-point rounding)
- Next calculation multiplies again: cumulative rounding errors compound
- After 1000 API calls, cost shows `$99.997` instead of `$100.000`
- User receives bill for discrepancy; disputes charge

**Why it happens:**
- Using JavaScript `number` (IEEE 754 float) for currency calculations instead of `Decimal`
- Rounding only at display time, not at calculation time
- Forgetting that 0.1 + 0.2 ≠ 0.3 in floating-point
- Multi-currency systems with conversion rates introduce additional rounding at each step
- Not accounting for currency-specific decimal places (USD = 2, JPY = 0, KWD = 3)

**Consequences:**
- Cost breakdown shows incorrect per-key costs
- Billing disputes from customers: "Your math is wrong"
- Audit failures: ledger doesn't match calculated costs
- Loss of user confidence in cost tracking feature

**Prevention:**

1. **Use Decimal type for all cost calculations**: Import `decimal.js`:
   ```typescript
   import Decimal from 'decimal.js';
   
   const tokenPrice = new Decimal('0.001234'); // Exact decimal
   const tokenCount = new Decimal('1500');
   const cost = tokenPrice.times(tokenCount); // Precise multiplication
   // Result: Decimal { value: '1.851' } (exact)
   ```

2. **Store costs as integers (cents) in database**: Never store floats for currency:
   ```typescript
   // Store as integer cents
   const costCents = cost.times(100).toNumber(); // 185 cents = $1.85
   // Query: SELECT cost_cents FROM usage WHERE key_id = ?
   // Display: (185 / 100).toFixed(2) = $1.85
   ```

3. **Apply rounding mode consistently**: Use banker's rounding (round-half-to-even) for all calculations:
   ```typescript
   Decimal.set({ rounding: Decimal.ROUND_HALF_EVEN });
   ```

4. **Test with edge case amounts**: Add unit tests:
   ```typescript
   test('0.1 + 0.2 should equal 0.3', () => {
     const result = new Decimal('0.1').plus(new Decimal('0.2'));
     expect(result.toString()).toBe('0.3');
   });
   ```

5. **Currency-specific decimal handling**: Document supported currencies and their decimal places:
   ```typescript
   const CURRENCY_DECIMALS = {
     'USD': 2,
     'EUR': 2,
     'JPY': 0,
     'KWD': 3,
   };
   
   function formatCost(cost: Decimal, currency: string): string {
     const decimals = CURRENCY_DECIMALS[currency];
     return cost.toFixed(decimals);
   }
   ```

6. **Audit trail for cost changes**: Log every cost calculation with Decimal values:
   ```typescript
   logger.info('Cost calculation', {
     key_id: keyId,
     token_count: '1500',
     unit_price: '0.001234',
     total_cost: '1.851',
     timestamp: new Date(),
   });
   ```

**Detection:**
- Cost breakdown total doesn't match sum of per-key costs (off by 0.01-0.10)
- User reports discrepancies in billing
- Audit log shows rounding errors accumulating

**Phase to Address:** Phase 1 (Cost Breakdown) — implement Decimal before first cost calculation

---

## Moderate Pitfalls

Mistakes that cause feature bugs or poor UX but don't break the system entirely.

### Pitfall 6: Webhook Retry Logic Without Dead-Letter Queue

**What goes wrong:**
- Webhook delivery to user's endpoint fails (user's server down)
- Alert system retries 3 times with exponential backoff, then gives up
- Alert is lost silently; no record of failure; no way to replay it later
- User never learns that an alert was triggered

**Why it happens:**
- Retry loop implemented locally without persistence
- No concept of "terminal failure" vs "transient failure"
- Failed webhooks discarded after retry exhaustion
- No monitoring for failed deliveries

**Consequences:**
- Alerts silently disappear if user's endpoint is temporarily unavailable
- Users miss critical budget alerts during their outages
- No way to detect systematic webhook failures

**Prevention:**

1. **Classify failures as retriable vs terminal**:
   - Retriable (5xx, 429): retry with exponential backoff
   - Terminal (4xx except 429, connection refused): move to DLQ immediately

2. **Implement dead-letter queue**:
   ```typescript
   interface FailedWebhook {
     id: string;
     user_id: string;
     endpoint: string;
     payload: object;
     error: string;
     last_attempt: Date;
     attempt_count: number;
     status: 'pending_retry' | 'dead_letter' | 'manual_review';
   }
   ```

3. **Retry strategy**:
   - Attempt 1: immediately
   - Attempt 2: after 1 minute
   - Attempt 3: after 10 minutes
   - Attempt 4: after 1 hour
   - After 4 attempts: move to DLQ and notify support

4. **Idempotency for retries**: Include idempotency key in webhook:
   ```typescript
   {
     "event_id": "alert-cost-threshold-123", // Unique per alert
     "timestamp": "2026-05-01T09:00:00Z",
     "cost_threshold": 100.00,
   }
   ```
   User's endpoint should check: "Have I processed event_id before?" If yes, return 200 without re-processing.

5. **Monitor DLQ health**:
   - Alert if DLQ has > 10 items
   - Weekly report: "5 webhooks failed, manual review needed"
   - Dashboard: Show delivery success rate per user

**Detection:**
- Webhook delivery failures in logs with no retry attempts
- User reports missing alerts during their service outages
- DLQ accumulates unprocessed events

**Phase to Address:** Phase 1 (Alert System) — implement before production

---

### Pitfall 7: Threshold Configuration UX Creates Analysis Paralysis

**What goes wrong:**
- Admin sets cost threshold to $100/month
- After 1 week, realizes they meant $100/week, changes it
- Emails start firing immediately for multiple thresholds
- Admin disables alerts entirely to stop the noise
- Feature becomes unused

**Why it happens:**
- No guidance on threshold values (what's reasonable for their org?)
- No preview of "how many alerts would fire if I set threshold to X?"
- Threshold UI shows absolute numbers without context (is $100 high or low?)
- No historical data to inform threshold choice
- "Set it and forget it" mentality; users don't review thresholds for months

**Consequences:**
- Thresholds remain poorly calibrated
- Alerts fire too frequently or not at all
- Users disable alerts to silence noise
- Feature adoption fails

**Prevention:**

1. **Provide intelligent default thresholds**: Analyze first 2 weeks of usage and suggest threshold:
   ```typescript
   const averageDailyCost = calcDailyAverage(pastTwoWeeks);
   const suggestedMonthlyThreshold = averageDailyCost * 30 * 1.5; // 50% over normal
   
   ui.show(`We suggest a monthly threshold of $${suggestedMonthlyThreshold.toFixed(2)} based on your recent usage.`);
   ```

2. **Add threshold preview**: Show "If you set threshold to $X, alerts would fire N times per month based on historical data":
   ```typescript
   const historicalData = getLastNinetyDays(keyId);
   const simulatedAlerts = historicalData.filter(day => day.cost > thresholdValue);
   ui.show(`This threshold would have triggered ${simulatedAlerts.length} times in the last 90 days.`);
   ```

3. **Provide context for threshold values**:
   ```typescript
   <select name="threshold">
     <option value="low" label="$50 (Typical starter limit)">
     <option value="medium" label="$500 (Growth plan limit)">
     <option value="high" label="$5000 (Enterprise limit)">
     <option value="custom" label="Custom value...">
   </select>
   ```

4. **Allow threshold templates**: Pre-built for common scenarios:
   - "Conservative" (alert at 10% over baseline)
   - "Standard" (alert at 50% over baseline)
   - "Aggressive" (alert at 200% over baseline)

5. **Quarterly threshold review prompt**: After 90 days, ask admin:
   ```
   "Your threshold is set to $100/month. You've hit this alert 3 times in 90 days. 
   Would you like to adjust it?"
   ```

6. **Show threshold effectiveness**: Dashboard metric:
   - Threshold set at: $100/month
   - Alerts fired: 4 in last 90 days
   - False positives: 0
   - Average response time: 2 hours

**Detection:**
- Low engagement: thresholds never updated after initial setup
- Users ask "what should my threshold be?"
- High alert disable rate after 2 weeks

**Phase to Address:** Phase 1 (Alert System) — include in UI design

---

### Pitfall 8: Scheduled Report Generation Blocks on Large Data Queries

**What goes wrong:**
- Monthly report scheduled for 1 AM (off-peak)
- Report queries all 30 days of usage data for 50 organization keys
- Query takes 8 seconds (large table scan)
- Report generation stalls; cron job hangs
- Next scheduled job (2 AM) tries to start; finds previous still running; deadlocks or queue exhausts
- Report system becomes unreliable

**Why it happens:**
- No indexes on `(user_id, created_at)` for time-range queries
- Querying SQLite without considering query plan
- No timeout on report generation
- Sequential processing instead of async queuing
- Not testing with realistic data volume (few rows in dev; millions in prod)

**Consequences:**
- Scheduled reports take 30+ minutes instead of < 5 minutes
- Multiple jobs pile up and cause system lag
- Reports never complete reliably

**Prevention:**

1. **Optimize report queries with proper indexes**:
   ```sql
   CREATE INDEX idx_usage_user_period ON usage_records(user_id, created_at);
   ```

2. **Add query timeout**: Fail fast if report query exceeds 10 seconds:
   ```typescript
   const query = db.prepare(
     'SELECT * FROM usage_records WHERE user_id = ? AND created_at BETWEEN ? AND ?'
   );
   query.timeout(10000); // 10 second timeout
   ```

3. **Batch report generation**: Don't generate all reports at once. Queue them:
   ```typescript
   // Phase 1: Queue all reports (1 second)
   for (const user of users) {
     reportQueue.push({ user_id: user.id, period: 'monthly' });
   }
   
   // Phase 2: Process queue with max 3 concurrent jobs (10 minutes)
   processQueue(reportQueue, { concurrency: 3, timeout: 5000 });
   ```

4. **Add progress tracking**: Log when each report starts/completes:
   ```typescript
   logger.info('Report generation started', { user_id, period });
   // ... generate report ...
   logger.info('Report generation completed', { user_id, period, duration_ms });
   ```

5. **Monitor report duration**: Alert if any report exceeds 30 seconds:
   ```typescript
   if (duration > 30000) {
     logger.warn('Slow report generation', { user_id, duration_ms });
     // Investigation needed
   }
   ```

**Detection:**
- Report generation duration increases weekly (indicates growing table)
- Cron jobs pile up and overlap
- Users report delayed reports arriving after 6+ hours

**Phase to Address:** Phase 2 (Automated Reports) — before production deployment

---

## Minor Pitfalls

Edge cases and nice-to-have improvements.

### Pitfall 9: Per-Key Cost Breakdown Doesn't Account for Shared Overhead

**What goes wrong:**
- Cost breakdown shows Key A: $45, Key B: $55 (sum = $100)
- But total organization cost was $120
- $20 unaccounted for (infrastructure, cache, overhead)
- Admin asks: "Where did $20 go?"

**Why it happens:**
- Attributing costs only to LLM calls
- Ignoring database queries, API gateway bandwidth, storage
- Assuming all costs are variable; no fixed costs
- Not discussing cost attribution model upfront

**Consequences:**
- User confusion about cost accounting
- Disputes: "Your math doesn't add up"
- Lack of trust in cost transparency

**Prevention:**

1. **Define cost attribution model clearly**:
   - Direct: Token-based LLM costs (100% attributable)
   - Shared: Database queries, infrastructure (distributed by key usage %)
   - Fixed: Data retention, API quotas (not attributed, shown separately)

2. **Show cost breakdown with transparency**:
   ```
   Key A:
   - Direct LLM costs: $45.00 (100 tokens * $0.000450)
   - Allocated infrastructure (5% of org usage): $2.50
   - Total: $47.50
   
   Key B: $52.50
   Shared overhead (not allocated): $20.00
   
   Grand total: $120.00
   ```

3. **Document the model**: In cost breakdown UI, include a link to docs explaining:
   - What's direct vs shared
   - How shared costs are calculated
   - Why total doesn't equal sum of keys

**Detection:**
- User asks: "Why is the total different?"
- Support questions about cost allocation

**Phase to Address:** Phase 1 (Cost Breakdown) — clarify in documentation

---

### Pitfall 10: Email Template Doesn't Render Correctly in All Email Clients

**What goes wrong:**
- Report email looks perfect in Gmail (desktop)
- Opens in Outlook and images are broken, text is misaligned
- Opens on iPhone and the PDF attachment won't display
- User gets confused email; low engagement

**Why it happens:**
- Using modern CSS that Outlook doesn't support (CSS Grid, Flexbox)
- Relying on external images without fallback
- Not testing across email clients
- Assuming HTML email = web HTML (very different)

**Consequences:**
- Low email engagement and open rates
- Poor user experience with cost breakdown emails
- Users don't trust the data if it looks broken

**Prevention:**

1. **Test email templates in multiple clients** (Litmus, Email on Acid):
   - Gmail (web, mobile)
   - Outlook (desktop, web)
   - Apple Mail
   - Yahoo
   - Hotmail
   - Mobile: iOS Mail, Android Gmail, Samsung Mail

2. **Use email-safe CSS only**:
   - Inline styles (Outlook ignores `<style>` tags)
   - No Flexbox or Grid
   - No CSS media queries
   - Background images with fallback colors

3. **Template example**:
   ```html
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
     <tr>
       <td align="center" style="padding: 20px; background-color: #f5f5f5;">
         <table role="presentation" width="600" cellpadding="0" cellspacing="0">
           <tr>
             <td style="padding: 20px; background-color: white;">
               <h1 style="font-size: 24px; color: #000;">Monthly Report</h1>
               <p style="font-size: 14px; color: #666;">Your usage summary...</p>
             </td>
           </tr>
         </table>
       </td>
     </tr>
   </table>
   ```

4. **Embed PDF as attachment**, not as image link (more reliable across clients)

5. **Test with real accounts**: Send test emails to personal Gmail, Outlook, etc., and view in their apps before launch

**Detection:**
- User reports: "Email looked broken"
- Low email engagement rate
- Email client complaints in support tickets

**Phase to Address:** Phase 1 (Alert Emails) — before first production email sent

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|-----------|
| Phase 1: Alert System | Multi-channel dispatch | Alert fatigue from duplicate notifications | Implement dedup + severity levels before coding |
| Phase 1: Alert System | Email delivery | Transactional emails go to spam silently | Use dedicated ESP; test SPF/DKIM/DMARC before launch |
| Phase 1: Alert System | Webhook reliability | Failed webhooks lost; no replay mechanism | Implement DLQ + idempotency key before release |
| Phase 1: Cost Breakdown | Currency calculations | Floating-point rounding errors accumulate | Use Decimal.js from day 1; don't refactor later |
| Phase 1: Cost Breakdown | Threshold UX | Users misconfigure thresholds; disable alerts | Provide defaults + preview + quarterly review |
| Phase 2: Automated Reports | PDF generation | OOM crashes during peak report time | Implement browser pooling + queue before scheduler |
| Phase 2: Automated Reports | Scheduling logic | DST transitions break scheduled reports | Use croner + timezone-aware schema before first cron |
| Phase 2: Automated Reports | Query performance | Large report queries block other jobs | Add indexes + timeout + batching before production |

---

## Integration Pitfalls (Cross-Phase)

### Pitfall: Alert Triggered But Cost Breakdown Hasn't Synced Yet

**Scenario:**
- Usage record created at 11:59 PM
- Alert system sees $101 cost (threshold $100) and fires immediately
- BifrostSyncService scheduled for midnight hasn't run yet
- User checks cost breakdown dashboard at 12:01 AM; shows $0 cost (sync hasn't run)
- User doubts alert: "Cost breakdown says $0 but I got alerted for $101?"

**Prevention:**
- Alert calculation should query SQLite sync table, not Bifrost API (ensure data consistency)
- Never alert before sync completes for that period
- Or: Alert from BifrostSyncService trigger (not separate alert service)

### Pitfall: Webhook Payload Schema Mismatch with Report PDF

**Scenario:**
- Alert webhook includes `cost_usd: 101.00`
- Report PDF shows `costCents: 10100` (inconsistent representation)
- User's webhook consumer can't reconcile values; debugging nightmare

**Prevention:**
- Single source of truth for cost representation
- Alert webhook and report PDF use identical schema
- Version the webhook payload schema

---

## Sources

- [Alert Fatigue 2026 - UpTickNow](https://upticknow.com/blog/reduce-alert-fatigue-monitoring-systems-2026.html)
- [Notification Fatigue Crisis - Courier.com Medium](https://courier-com.medium.com/notification-fatigue-is-real-and-getting-worse-e4fc248dc29f)
- [Email Deliverability 2026 - Kirim Email](https://en.kirim.email/blog/email-deliverability-2026/)
- [Email Deliverability Complete Guide - Mailtrap](https://mailtrap.io/blog/email-deliverability-issues/)
- [PDF Generation in Node.js - Joyfill](https://joyfill.io/blog/integrating-pdf-generation-into-node-js-backends-tips-gotchas/)
- [Bun vs Node.js 2026 - Byteiota](https://byteiota.com/bun-vs-deno-vs-node-js-2026-real-benchmarks-mislead/)
- [Cron & Daylight Saving - node-cron GitHub](https://github.com/kelektiv/node-cron/issues/56)
- [Croner Timezone Support - GitHub](https://github.com/Hexagon/croner)
- [Financial Precision in JavaScript - DEV Community](https://dev.to/benjamin_renoux/financial-precision-in-javascript-handle-money-without-losing-a-cent-1chc)
- [Decimal Precision in Currency - Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/sales/decimal-precision-currency-pricing)
- [Webhook Reliability Guide 2026 - Hooklistener](https://www.hooklistener.com/learn/realtime-webhooks-reliability)
- [Webhook Retry Best Practices - Hookdeck](https://hookdeck.com/outpost/guides/outbound-webhook-retry-best-practices/)
- [Alert Threshold Design - OneUptime](https://oneuptime.com/blog/post/2026-01-30-alerting-threshold-design/view)
- [API Rate Limiting Guide 2026 - Levo.ai](https://www.levo.ai/resources/blogs/api-rate-limiting-guide-2026)

