# Design Spec: Manager Settings UI Optimization

**Date:** 2026-04-17
**Topic:** Manager Settings UI Optimization
**Status:** Approved by User

## 1. Objective
Optimize the Manager Settings page (`/manager/settings`) to improve readability, visual hierarchy, and user experience while maintaining the "Draupnir/Bifrost" hard-core aesthetic.

## 2. Visual Style
- **Aesthetic Direction**: Refined Dark Mode (Zinc-based) with Hard-core accents.
- **Color Palette**:
  - Main Background: `#09090b` (Zinc-950)
  - Card/Section Background: `#18181b` (Zinc-900)
  - Border/Separator: `#27272a` (Zinc-800)
  - Primary Accent: `#6366f1` (Indigo-500)
  - Error/Destructive: `#f87171` (Red-400) - Optimized for dark mode contrast.
  - Success: `#4ade80` (Green-400)
- **Typography**:
  - Labels, Captions, Mono-accents: `font-mono` (monospace)
  - Body, Headings: `font-sans` (Inter or system-sans)
- **Borders**: Sharp edges (`rounded-none` or very minimal `rounded-sm`).

## 3. Layout
- **Desktop**: Two-column layout or organized sections with clear visual separation.
- **Mobile**: Single column, vertically stacked sections.
- **Structure**:
  - Profile Section: Avatar preview (Initials), Display Name input.
  - Password Section: Current Password, New Password, Confirm Password.
  - Interactive Feedback: Progressive password strength indicator (visual bar).

## 4. Components & Interactions
- **Card**: Enhanced with Zinc elevation and Indigo top-border or side-accents for active sections.
- **Input**: Minimalist, transparent background with bottom border or thin outline.
- **Button**: Solid primary for "Save", secondary/outline for others.
- **Feedback**:
  - Success/Error Toasts (via Inertia/Toaster).
  - Inline error messages with icons (`AlertCircle`).
  - Loading states on buttons.

## 5. Accessibility
- Ensure text contrast ratios meet WCAG AA (4.5:1) for body text and AAA (7:1) for headings where possible.
- Use icons alongside color for status indicators (e.g., error messages).

## 6. Implementation Plan
- Modify `resources/js/Pages/Manager/Settings/Index.tsx`.
- Standardize colors and spacing using Tailwind Zinc palette.
- Implement tabbed or structured layout.
- Add password strength bar component.
