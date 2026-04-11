---
status: partial
phase: 08-data-correctness-permission-foundation
source:
  - 08-01-SUMMARY.md
  - ROADMAP.md (Phase 8 success criteria)
started: "2026-04-11T12:00:00Z"
updated: "2026-04-11T15:00:00Z"
---

## Current Test

[testing paused — 4 tests blocked: cannot log in to exercise member/admin flows]

## Tests

### 1. Member dashboard — usage scoped to own API keys only
expected: Org member sees summary/usage only for their own keys; no visibility into another member’s keys or costs on the member dashboard.
result: pass

### 2. Manager dashboard — org-wide usage summary
expected: Sign in as an organization **manager** (same org as above). The member dashboard summary and usage should include **all active org keys** (yours and other members’), consistent with an org-wide roll-up.
result: blocked
blocked_by: other
reason: "目前無法正常登入所以無法測試"

### 3. Member usage page — logs and tokens for scoped keys only
expected: As an org **member**, open the member usage / chart view for the org. Logs and aggregates should correspond to **your** gateway keys only. When Bifrost returns non-zero input/output tokens for those keys, the UI shows non-zero token-related values (not stuck at zero because of field mismatches).
result: blocked
blocked_by: other
reason: "目前無法正常登入所以無法測試"

### 4. Member org access failure stays inline
expected: As a member, open the member dashboard with an `orgId` you are **not** a member of (or trigger a summary failure). The page should show an **inline error message** (e.g. via props), not an HTTP **403** page and not a redirect away from the dashboard for that failure mode.
result: blocked
blocked_by: other
reason: "目前無法正常登入所以無法測試"

### 5. Platform admin dashboard — live service totals
expected: Sign in as **global admin** and open the admin dashboard (`Admin/Dashboard/Index`). Totals for users, organizations, and contracts should match **live list services** (real counts from the backend), not hardcoded placeholder totals.
result: blocked
blocked_by: other
reason: "目前無法正常登入所以無法測試"

## Summary

total: 5
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 4

## Gaps

[none yet]
