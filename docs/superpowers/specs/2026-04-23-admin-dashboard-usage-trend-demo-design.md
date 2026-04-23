# Design Spec: Admin Dashboard Usage Trend Demo Data

## Context
Currently, the "System-wide Usage Trends" chart on the admin dashboard appears empty or flat when no usage records are present in the system. To provide a better user experience and demonstrate the platform's analytical capabilities, we will implement a "Demo Mode" that generates realistic, randomized trend data when real data is unavailable.

## Requirements
- Detect if the current usage trend data is empty (all zeros).
- If empty, generate a set of randomized but plausible mock data points for the selected time window (7, 15, or 30 days).
- Clearly indicate that the data being shown is for demonstration purposes.
- Maintain existing chart behaviors (hover tooltips, time window switching).

## Architecture Changes

### Backend (AdminDashboardPage.ts)
- Implement a check for "all zeros" in the `usageTrend` result.
- Generate mock data procedurally if real data is missing.
- Pass an `isUsageTrendDemo` flag to the Inertia page.

### Frontend (UsageLineChart.tsx)
- Add an `isDemo` prop.
- If `isDemo` is true, render a subtle "Demo Data" badge next to the title.
- Show the randomized data instead of the `EmptyChart` component.

### Frontend (AdminDashboard Index.tsx)
- Receive the `isUsageTrendDemo` prop and pass it down to `UsageLineChart`.

## UI/UX Design
- **Demo Badge:** A small, pill-shaped badge next to the "System-wide Usage Trends" title.
- **Style:** `bg-muted text-muted-foreground` with a subtle border. Font: Geist Mono, uppercase, small size (10px).
- **Text:** "範例數據" (ZH) / "DEMO DATA" (EN).

## Implementation Details

### Mock Data Algorithm
- **Requests:** 500-1500 per day, with a 30% upward trend over the window and 20% random variance.
- **Tokens:** Randomized multiplier of requests (e.g., 200-300 tokens per request).
- **Dates:** Use the existing dates from the real (empty) trend to ensure they match the user's selected window.

## Success Criteria
- If there is data in the system, the real data is shown and no demo badge appears.
- If there is no data, a randomized trend is shown with a "Demo Data" badge.
- Switching between 7, 15, and 30 days in demo mode regenerates appropriate randomized trends.
