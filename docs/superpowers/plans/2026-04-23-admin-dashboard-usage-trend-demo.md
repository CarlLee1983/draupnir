# Admin Dashboard Usage Trend Demo Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a "Demo Mode" for the admin dashboard usage trend chart that generates realistic randomized data when real data is missing, providing a better first-run experience.

**Architecture:** 
1. **Backend:** Modify `AdminDashboardPage.ts` to detect zero-value trends and generate procedural mock data as a fallback.
2. **Frontend:** Update `UsageLineChart.tsx` to accept an `isDemo` prop and display a "DEMO DATA" badge when active.
3. **Data Flow:** Pass the `isUsageTrendDemo` flag from the page to the chart component.

**Tech Stack:** TypeScript, React (Inertia.js), Recharts, Geist Mono font.

---

### Task 1: Backend Demo Data Generation

**Files:**
- Modify: `src/Website/Admin/Pages/AdminDashboardPage.ts`
- Test: `src/Website/__tests__/Admin/AdminDashboardPage.test.ts`

- [ ] **Step 1: Update the test to check for demo data fallback**

Add a test case to `src/Website/__tests__/Admin/AdminDashboardPage.test.ts` that mocks a zero-data response from `adminUsageTrendService` and asserts that `usageTrend` in the returned props is not empty and `isUsageTrendDemo` is true.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun vitest src/Website/__tests__/Admin/AdminDashboardPage.test.ts`

- [ ] **Step 3: Implement demo data logic in `AdminDashboardPage.ts`**

Modify `src/Website/Admin/Pages/AdminDashboardPage.ts` to detect empty data (all zeros) and generate mock points with randomized but realistic values.

- [ ] **Step 4: Run tests to verify success**

Run: `bun vitest src/Website/__tests__/Admin/AdminDashboardPage.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/Website/Admin/Pages/AdminDashboardPage.ts src/Website/__tests__/Admin/AdminDashboardPage.test.ts
git commit -m "feat(admin): generate demo usage trend data when real data is missing"
```

---

### Task 2: Frontend "Demo" Badge & Chart Update

**Files:**
- Modify: `resources/js/components/charts/UsageLineChart.tsx`
- Modify: `resources/js/Pages/Admin/Dashboard/Index.tsx`
- Modify: `resources/js/lib/i18n/locales/en.json`
- Modify: `resources/js/lib/i18n/locales/zh.json`

- [ ] **Step 1: Add `isDemo` prop and Badge to `UsageLineChart.tsx`**

Modify `resources/js/components/charts/UsageLineChart.tsx` to handle the `isDemo` prop and render a small "Demo Data" badge next to the title.

- [ ] **Step 2: Update `Admin/Dashboard/Index.tsx` to pass the flag**

Modify `resources/js/Pages/Admin/Dashboard/Index.tsx` to receive the `isUsageTrendDemo` prop from the backend and pass it to the `UsageLineChart`.

- [ ] **Step 3: Update localization files**

Add `ui.charts.demoBadge` to `resources/js/lib/i18n/locales/en.json` ("Demo Data") and `zh.json` ("範例數據").

- [ ] **Step 4: Commit**

```bash
git add resources/js/components/charts/UsageLineChart.tsx resources/js/Pages/Admin/Dashboard/Index.tsx resources/js/lib/i18n/locales/*.json
git commit -m "feat(ui): add demo badge to UsageLineChart and wire up admin dashboard"
```

---

### Task 3: Final Verification

- [ ] **Step 1: Run all related tests**

Run: `bun vitest src/Website/__tests__/Admin/AdminDashboardPage.test.ts`

- [ ] **Step 2: Verify component default prop**

Ensure `Member/Usage/Index.tsx` still compiles and works as expected with the new optional `isDemo` prop.

- [ ] **Step 3: Commit any final fixes**
