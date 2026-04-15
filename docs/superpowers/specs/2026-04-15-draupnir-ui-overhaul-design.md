# Design Spec: Draupnir UI/UX Overhaul — "Midnight Bloom / Cleaner Lines"

## 1. Vision & Goals
Draupnir is an AI Service Management platform. The current UI feels "generic SaaS." This overhaul introduces a **Functional Contrast** system that balances immersive data visualization with high-productivity configuration interfaces.

- **Primary Goal:** Establish a unique, technical, and premium brand identity.
- **Aesthetic:** "Midnight Bloom" (Immersive Dark) with "Cleaner Lines" (Precision Geometry).
- **Core Strategy:** Forced dark-mode foundation for analytics, shifting to high-clarity light panels for forms/settings.

## 2. Design System Tokens (Phase 1)

### 2.1 Colors
- **Background:** `#09090b` (Deep Black/Zinc-950)
- **Border:** `#27272a` (Zinc-800) for sharp geometric definition.
- **Accents:** 
  - Indigo/Violet (`#6366f1` / `#a855f7`) for primary system status.
  - Blue/Cyan (`#3b82f6` / `#06b6d4`) for secondary metrics.
  - Emerald (`#10b981`) for success/healthy states.
- **Surface:** `rgba(255, 255, 255, 0.03)` with `backdrop-filter: blur(12px)`.

### 2.2 Typography
- **Display/Headings:** `Geist Sans` (or `Space Grotesk`) for impact and modern feel.
- **Technical/Labels:** `Geist Mono` for system metadata, organization IDs, and metric labels.
- **Body:** `Geist Sans` for optimal readability.

### 2.3 Layout & Geometry
- **Grid:** Shift from independent floating cards to a "Geometric Grid" (shared borders, 1px gaps).
- **Radius:** Sharp `8px` (lg) / `4px` (md) for a technical, precise feel.
- **Spacing:** Strict 8px mathematical grid (sm: 8px, md: 16px, lg: 32px, xl: 40px).

## 3. Component Architecture

### 3.1 `MetricGrid`
A new high-density layout for top-level KPIs.
- Shared 1px borders between items.
- Vertical gradient accent lines at the top of each cell.
- Labels in `Geist Mono` (uppercase, tracked).

### 3.2 `UsageTimeline`
Redesigned chart container.
- Background grid lines synchronized with the layout grid.
- High-contrast area charts with minimal glow.

## 4. Implementation Plan (Phase 2)

### Step 1: Foundation (Theme)
- Update `tailwind.config.ts` with Geist fonts and Midnight Bloom color palette.
- Refine `resources/css/app.css` base layer (background, foreground, border defaults).

### Step 2: Main Dashboard Overhaul
- Refactor `resources/js/Pages/Member/Dashboard/Index.tsx` to use the new Geometric Grid.
- Implement the `MetricCard` and `Chart` refinements based on the "Cleaner Lines" mockup.

### Step 3: Global Navigation & TopBar
- Update `Sidebar.tsx` and `TopBar.tsx` to match the new dark-technical aesthetic.

## 5. Success Criteria
- [ ] Dashboard feels "technical" and "precise" rather than generic.
- [ ] Information density is maintained or improved.
- [ ] Visual hierarchy clearly distinguishes between system status and user data.
