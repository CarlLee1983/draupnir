# Design Spec: Member Dashboard Empty State Optimization

**Date:** 2026-04-15
**Status:** Draft
**Topic:** Improving the user experience for the Member Dashboard when no usage data is available.

## 1. Problem Statement
The current Member Dashboard in its "empty state" (no usage data) displays several issues:
- **Redundant Information:** The `EmptyStateCard` displays the same description text twice due to a bug in `resources/js/Pages/Member/Dashboard/Index.tsx`.
- **Information Noise:** The `MetricSection` displays four cards with "0" or "$0.00" values, which provides low value to new users and clutters the interface.
- **Weak Guidance:** The `QuickActionsCard` is sparse and lacks clear "next steps" for a developer who just signed up (e.g., links to documentation or adding funds).

## 2. Goals
- **Reduce Noise:** Hide low-value metrics when there is no data to show.
- **Fix Bugs:** Resolve the text duplication in the empty state card.
- **Improve Onboarding:** Provide clear, actionable paths for new users via an enhanced Quick Actions component.
- **Maintain Consistency:** Adhere to the existing minimalist dark/OLED aesthetic.

## 3. Proposed Changes

### 3.1. `EmptyStateCard` (in `Index.tsx`)
- **Fix:** Remove the duplicate `<p>` tag inside `CardContent`.
- **Refinement:** Ensure the `CardDescription` is clear about the 5-minute sync interval.

### 3.2. Layout Logic (in `Index.tsx`)
- **Conditional Rendering:** Update the rendering logic to hide `<MetricSection />` when `showEmptyState` is true.
- **Layout Adjustment:** Ensure the `EmptyStateCard` and `QuickActionsCard` are positioned prominently.

### 3.3. `QuickActionsCard.tsx`
- **New Actions:**
    - **View Documentation:** Add a button linking to `/docs` (or a relevant docs URL) with a `BookOpen` icon.
    - **Add Funds / Wallet:** Add a button linking to the billing/wallet section with a `Wallet` icon.
- **Enhanced UI:**
    - Add `lucide-react` icons (`Plus`, `BarChart`, `BookOpen`, `Wallet`) to all action buttons.
    - Improve spacing and button grouping.
    - Maintain the `bg-white/[0.02]` card style with `border-border`.

### 3.4. I18n Updates (in `loadMessages.ts`)
- Add/Update keys for new quick actions:
    - `ui.member.dashboard.viewDocs`: "View Documentation"
    - `ui.member.dashboard.addFunds`: "Add Funds"

## 4. Architecture & Data Flow
- **Component Level:** Purely frontend UI adjustments in React/Inertia components.
- **State Management:** Uses existing `showEmptyState` derived state in the `MemberDashboard` component.

## 5. Verification Plan
- **Manual QA:** 
    - Log in as a new user with an organization but no usage data.
    - Verify `MetricSection` is hidden.
    - Verify `EmptyStateCard` text is not duplicated.
    - Verify all 4 quick actions are visible with correct icons and links.
- **Snapshot Testing:** Update or add vitest snapshots for the Dashboard components.
