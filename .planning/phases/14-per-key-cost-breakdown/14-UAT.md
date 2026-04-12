---
status: complete
phase: 14-per-key-cost-breakdown
source: 14-01-SUMMARY.md, 14-02-SUMMARY.md
started: 2026-04-12T00:00:00Z
updated: 2026-04-12T14:37:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Navigate to Cost Breakdown page
expected: Visit /member/cost-breakdown. The page loads without errors. The sidebar shows a PieChart nav item linking to this page. The page shows a header "Cost Breakdown" with a time window selector (7d/30d/90d).
result: pass

### 2. View Per-Key Cost Table
expected: The page displays a sortable table with columns: API Key, Requests, Tokens, Cost, Efficiency, % of Total, Status. A totals row appears at the bottom showing aggregated figures. Columns can be sorted by clicking headers.
result: pass

### 3. Expand Key Row for Model Breakdown
expected: Click the expand icon on a key row. A nested "Model Distribution" section appears showing the model breakdown (models used, cost per model). The main table remains visible with the row expanded inline.
result: pass

### 4. View Model Distribution Donut Chart
expected: The page shows a donut chart with model cost distribution. Next to it is a side table listing models with costs. If more than 8 models exist, they are grouped as "Other". Chart is interactive (hover shows model names and costs).
result: pass

### 5. Switch Time Window
expected: The 7d/30d/90d selector at the top works. Clicking different windows fetches new data and updates the table and donut chart. Loading state appears briefly during the fetch.
result: pass

### 6. Print Report
expected: Click a Print button on the page. The browser print dialog opens. The report shows the per-key cost table, donut chart, and model distribution table in a print-friendly layout.
result: pass

### 7. Per-Key Cost API Response (Backend)
expected: Call GET /api/dashboard/per-key-cost. The response includes an array of cost objects, each with: apiKeyId, apiKeyLabel, requestCount, totalCost, efficiency metrics, percentOfTotal. All values are non-null and numbers. Key labels are human-readable (not UUIDs).
result: pass

### 8. Role-Scoped Per-Key Cost (Access Control)
expected: Log in as a different organization member (MEMBER role). The per-key cost table shows only keys belonging to that member's organization. Cross-org keys should not appear. Verify with network inspector or by confirming visible keys match the current organization.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
